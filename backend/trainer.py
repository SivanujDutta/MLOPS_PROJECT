import os
import urllib.parse
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, GradientBoostingRegressor
from sklearn.svm import SVR, SVC
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.neural_network import MLPClassifier, MLPRegressor
from sklearn.metrics import accuracy_score, mean_squared_error
import boto3
import psycopg2
import optuna
import shap
import joblib
import uuid
import json

# Suppress optuna spam in terminal
optuna.logging.set_verbosity(optuna.logging.WARNING)

def get_s3_client():
    return boto3.client(
        's3',
        region_name=os.getenv("AWS_REGION"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
    )

def download_from_s3(s3_url: str, local_path: str):
    """
    Downloads a file from S3 using the provided full S3 URL.
    """
    print(f"Downloading dataset from S3...")
    bucket_name = os.getenv("S3_BUCKET_NAME")
    parsed_url = urllib.parse.urlparse(s3_url)
    s3_key = parsed_url.path.lstrip("/")
    
    s3 = get_s3_client()
    s3.download_file(bucket_name, s3_key, local_path)
    print(f"Download complete: {local_path}")

def upload_model_to_s3(local_path: str, experiment_id: str) -> str:
    """
    Uploads the serialized joblib model to S3 and returns the public URL.
    """
    print(f"Uploading model to S3...")
    bucket_name = os.getenv("S3_BUCKET_NAME")
    s3_key = f"models/{experiment_id}/model.joblib"
    
    s3 = get_s3_client()
    s3.upload_file(local_path, bucket_name, s3_key)
    
    region = os.getenv("AWS_REGION")
    s3_url = f"https://{bucket_name}.s3.{region}.amazonaws.com/{s3_key}"
    print(f"Model uploaded to: {s3_url}")
    return s3_url

def update_experiment_status(experiment_id: str, status: str, error_message: str = None):
    """
    Connects to the Neon Postgres database and updates the Experiment status.
    """
    print(f"Updating Experiment status to {status}...")
    try:
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cur = conn.cursor()
        
        cur.execute(
            """
            UPDATE "Experiment" 
            SET status = %s, "errorMessage" = %s, "updatedAt" = NOW()
            WHERE id = %s
            """,
            (status, error_message, experiment_id)
        )
        conn.commit()
        cur.close()
        conn.close()
        print(f"Experiment status updated successfully!")
    except Exception as e:
        print(f"Experiment update failed: {e}")

def insert_model_record(experiment_id: str, algorithm_name: str, best_params: dict, metrics: dict, feature_importance: dict, s3_url: str):
    """
    Inserts a completely new row into the Model table.
    """
    print(f"Inserting new Model record into database...")
    try:
        conn = psycopg2.connect(os.getenv("DATABASE_URL"))
        cur = conn.cursor()
        
        # Generate our own UUID since we are bypassing Prisma
        model_id = str(uuid.uuid4())
        
        cur.execute(
            """
            INSERT INTO "Model" (
                id, "experimentId", "algorithmName", hyperparameters, metrics, "featureImportance", "s3ModelPath", "isDeployed", "createdAt", "updatedAt"
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, false, NOW(), NOW()
            )
            """,
            (
                model_id,
                experiment_id,
                algorithm_name,
                json.dumps(best_params),
                json.dumps(metrics),
                json.dumps(feature_importance),
                s3_url
            )
        )
        conn.commit()
        cur.close()
        conn.close()
        print(f"Model record inserted successfully!")
    except Exception as e:
        print(f"Model insert failed: {e}")

def train_experiment(task_data: dict):
    """
    The advanced ML pipeline.
    """
    experiment_id = task_data['experimentId']
    s3_url = task_data['s3Url']
    target_column = task_data['targetColumn']
    task_type = task_data['taskType']
    
    local_csv = f"/tmp/{experiment_id}.csv" if os.name != 'nt' else f"{experiment_id}.csv"
    local_model = f"/tmp/{experiment_id}.joblib" if os.name != 'nt' else f"{experiment_id}.joblib"
    
    try:
        # 1. Download Data
        download_from_s3(s3_url, local_csv)
        
        # 2. Load and Preprocess Data
        print(f"Loading and cleaning data...")
        df = pd.read_csv(local_csv)
        
        if target_column not in df.columns:
            raise ValueError(f"Target column '{target_column}' not found in dataset!")
            
        X = df.drop(columns=[target_column])
        y = df[target_column]
        
        # Drop rows where target is missing
        valid_idx = y.dropna().index
        X = X.loc[valid_idx]
        y = y.loc[valid_idx]
        
        selected_features = task_data.get('selectedFeatures')
        if selected_features:
            valid_features = [f for f in selected_features if f in X.columns]
            if not valid_features:
                raise ValueError("None of the selected features were found in the dataset.")
            X = X[valid_features]
            
        # Target encoding for classification
        if task_type == 'CLASSIFICATION' and y.dtype == 'object':
            from sklearn.preprocessing import LabelEncoder
            le = LabelEncoder()
            y = pd.Series(le.fit_transform(y), name=y.name)
            
        # Build Preprocessor Pipeline
        from sklearn.compose import ColumnTransformer
        from sklearn.pipeline import Pipeline
        from sklearn.impute import SimpleImputer
        from sklearn.preprocessing import OrdinalEncoder
        
        numeric_features = X.select_dtypes(include=['int64', 'float64']).columns.tolist()
        categorical_features = X.select_dtypes(include=['object', 'category', 'bool']).columns.tolist()
        
        transformers = []
        if numeric_features:
            transformers.append(('num', SimpleImputer(strategy='median'), numeric_features))
        if categorical_features:
            cat_pipe = Pipeline(steps=[
                ('imputer', SimpleImputer(strategy='most_frequent')),
                ('encoder', OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1))
            ])
            transformers.append(('cat', cat_pipe, categorical_features))
            
        preprocessor = ColumnTransformer(transformers=transformers)
        
        print("Fitting preprocessor for imputation and encoding...")
        X_processed_array = preprocessor.fit_transform(X)
        
        if X_processed_array.shape[1] == 0:
            raise ValueError("No valid features left after preprocessing!")

        # Reconstruct DataFrame with feature names for SHAP
        feature_names = numeric_features + categorical_features
        X = pd.DataFrame(X_processed_array, columns=feature_names)
        
        # 3. Train/Test Split
        print(f"Splitting data into 80% train / 20% test...")
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # 4. OPTUNA: Hyperparameter Tuning
        n_trials = task_data.get('optunaTrials', 10)
        print(f"Running Optuna Hyperparameter tuning for {task_type} ({n_trials} trials)...")
        
        def objective(trial):
            if task_type == 'CLASSIFICATION':
                classifier_name = trial.suggest_categorical("classifier", ["SVC", "RandomForest", "DecisionTree", "LogisticRegression", "KNN", "ANN"])
                if classifier_name == "SVC":
                    C = trial.suggest_float('svc_c', 1e-3, 1e3, log=True)
                    kernel = trial.suggest_categorical('svc_kernel', ['linear', 'rbf', 'poly'])
                    m = SVC(C=C, kernel=kernel, probability=True, random_state=42)
                elif classifier_name == "RandomForest":
                    n_estimators = trial.suggest_int('rf_n_estimators', 50, 200)
                    max_depth = trial.suggest_int('rf_max_depth', 3, 20)
                    criterion = trial.suggest_categorical('rf_criterion', ['gini', 'entropy', 'log_loss'])
                    m = RandomForestClassifier(n_estimators=n_estimators, max_depth=max_depth, criterion=criterion, random_state=42)
                elif classifier_name == "DecisionTree":
                    max_depth = trial.suggest_int('dt_max_depth', 3, 20)
                    criterion = trial.suggest_categorical('dt_criterion', ['gini', 'entropy', 'log_loss'])
                    m = DecisionTreeClassifier(max_depth=max_depth, criterion=criterion, random_state=42)
                elif classifier_name == "LogisticRegression":
                    C = trial.suggest_float('lr_c', 1e-3, 1e3, log=True)
                    m = LogisticRegression(C=C, random_state=42, max_iter=1000)
                elif classifier_name == "KNN":
                    n_neighbors = trial.suggest_int('knn_n_neighbors', 3, 15)
                    weights = trial.suggest_categorical('knn_weights', ['uniform', 'distance'])
                    m = KNeighborsClassifier(n_neighbors=n_neighbors, weights=weights)
                elif classifier_name == "ANN":
                    hidden_layer_sizes = trial.suggest_categorical('ann_hidden_layers', [(50,), (100,), (50, 50), (100, 50)])
                    alpha = trial.suggest_float('ann_alpha', 1e-5, 1e-1, log=True)
                    m = MLPClassifier(hidden_layer_sizes=hidden_layer_sizes, alpha=alpha, random_state=42, max_iter=1000)
                
                m.fit(X_train, y_train)
                return accuracy_score(y_test, m.predict(X_test))
            else:
                regressor_name = trial.suggest_categorical("regressor", ["SVR", "RandomForest", "DecisionTree", "GradientBoosting", "ANN"])
                if regressor_name == "SVR":
                    C = trial.suggest_float('svr_c', 1e-3, 1e3, log=True)
                    kernel = trial.suggest_categorical('svr_kernel', ['linear', 'rbf', 'poly'])
                    m = SVR(C=C, kernel=kernel)
                elif regressor_name == "RandomForest":
                    n_estimators = trial.suggest_int('rf_n_estimators', 50, 200)
                    max_depth = trial.suggest_int('rf_max_depth', 3, 20)
                    criterion = trial.suggest_categorical('rf_criterion', ['squared_error', 'absolute_error'])
                    m = RandomForestRegressor(n_estimators=n_estimators, max_depth=max_depth, criterion=criterion, random_state=42)
                elif regressor_name == "DecisionTree":
                    max_depth = trial.suggest_int('dt_max_depth', 3, 20)
                    criterion = trial.suggest_categorical('dt_criterion', ['squared_error', 'absolute_error'])
                    m = DecisionTreeRegressor(max_depth=max_depth, criterion=criterion, random_state=42)
                elif regressor_name == "GradientBoosting":
                    n_estimators = trial.suggest_int('gb_n_estimators', 50, 200)
                    max_depth = trial.suggest_int('gb_max_depth', 3, 20)
                    learning_rate = trial.suggest_float('gb_learning_rate', 1e-3, 1.0, log=True)
                    m = GradientBoostingRegressor(n_estimators=n_estimators, max_depth=max_depth, learning_rate=learning_rate, random_state=42)
                elif regressor_name == "ANN":
                    hidden_layer_sizes = trial.suggest_categorical('ann_hidden_layers', [(50,), (100,), (50, 50), (100, 50)])
                    alpha = trial.suggest_float('ann_alpha', 1e-5, 1e-1, log=True)
                    m = MLPRegressor(hidden_layer_sizes=hidden_layer_sizes, alpha=alpha, random_state=42, max_iter=1000)

                m.fit(X_train, y_train)
                return mean_squared_error(y_test, m.predict(X_test))
                
        direction = 'maximize' if task_type == 'CLASSIFICATION' else 'minimize'
        study = optuna.create_study(direction=direction)
        study.optimize(objective, n_trials=n_trials)
        
        best_params = study.best_params
        print(f"Optuna found best parameters: {best_params}")
        
        # 5. Train Final Model with Best Parameters
        metrics = {}
        
        if task_type == 'CLASSIFICATION':
            from sklearn.metrics import f1_score
            algorithm_name = best_params.pop('classifier')
            
            if algorithm_name == "SVC":
                model = SVC(C=best_params['svc_c'], kernel=best_params['svc_kernel'], probability=True, random_state=42)
            elif algorithm_name == "RandomForest":
                model = RandomForestClassifier(n_estimators=best_params['rf_n_estimators'], max_depth=best_params['rf_max_depth'], criterion=best_params['rf_criterion'], random_state=42)
            elif algorithm_name == "DecisionTree":
                model = DecisionTreeClassifier(max_depth=best_params['dt_max_depth'], criterion=best_params['dt_criterion'], random_state=42)
            elif algorithm_name == "LogisticRegression":
                model = LogisticRegression(C=best_params['lr_c'], random_state=42, max_iter=1000)
            elif algorithm_name == "KNN":
                model = KNeighborsClassifier(n_neighbors=best_params['knn_n_neighbors'], weights=best_params['knn_weights'])
            elif algorithm_name == "ANN":
                model = MLPClassifier(hidden_layer_sizes=best_params['ann_hidden_layers'], alpha=best_params['ann_alpha'], random_state=42, max_iter=1000)
                
            model.fit(X_train, y_train)
            preds = model.predict(X_test)
            acc = accuracy_score(y_test, preds)
            f1 = f1_score(y_test, preds, average='weighted')
            metrics['accuracy'] = float(acc)
            metrics['f1_score'] = float(f1)
            print(f"Final Classification Accuracy: {acc:.2%}")
        else:
            from sklearn.metrics import mean_absolute_error, r2_score
            algorithm_name = best_params.pop('regressor')
            
            if algorithm_name == "SVR":
                model = SVR(C=best_params['svr_c'], kernel=best_params['svr_kernel'])
            elif algorithm_name == "RandomForest":
                model = RandomForestRegressor(n_estimators=best_params['rf_n_estimators'], max_depth=best_params['rf_max_depth'], criterion=best_params['rf_criterion'], random_state=42)
            elif algorithm_name == "DecisionTree":
                model = DecisionTreeRegressor(max_depth=best_params['dt_max_depth'], criterion=best_params['dt_criterion'], random_state=42)
            elif algorithm_name == "GradientBoosting":
                model = GradientBoostingRegressor(n_estimators=best_params['gb_n_estimators'], max_depth=best_params['gb_max_depth'], learning_rate=best_params['gb_learning_rate'], random_state=42)
            elif algorithm_name == "ANN":
                model = MLPRegressor(hidden_layer_sizes=best_params['ann_hidden_layers'], alpha=best_params['ann_alpha'], random_state=42, max_iter=1000)

            model.fit(X_train, y_train)
            preds = model.predict(X_test)
            mse = mean_squared_error(y_test, preds)
            rmse = np.sqrt(mse)
            mae = mean_absolute_error(y_test, preds)
            r2 = r2_score(y_test, preds)
            metrics['mse'] = float(mse)
            metrics['rmse'] = float(rmse)
            metrics['mae'] = float(mae)
            metrics['r2'] = float(r2)
            print(f"Final Regression RMSE: {rmse:.4f}")
            
        # 6. SHAP: Feature Importance Extraction
        print(f"Running SHAP explainability analysis...")
        if algorithm_name in ["RandomForest", "DecisionTree", "GradientBoosting"]:
            explainer = shap.TreeExplainer(model)
            shap_values = explainer.shap_values(X_test)
        else:
            background = shap.kmeans(X_train, 10)
            explainer = shap.KernelExplainer(model.predict, background)
            sample_size = min(100, len(X_test))
            shap_values = explainer.shap_values(X_test[:sample_size])
        
        if isinstance(shap_values, list):
            idx = 1 if len(shap_values) > 1 else 0
            mean_shap = np.abs(shap_values[idx]).mean(axis=0)
        else:
            mean_shap = np.abs(shap_values).mean(axis=0)
            
        # Normalize SHAP values to be out of 100
        total_shap = mean_shap.sum()
        if total_shap > 0:
            mean_shap = (mean_shap / total_shap) * 100
            
        feature_importance = {feat: round(float(val), 4) for feat, val in zip(X.columns, mean_shap)}
        feature_importance = dict(sorted(feature_importance.items(), key=lambda item: item[1], reverse=True))
        print(f"Top 3 Features: {list(feature_importance.items())[:3]}")
        
        # 7. Serialize & Save Model to S3
        print(f"Serializing pipeline via joblib...")
        final_pipeline = Pipeline(steps=[('preprocessor', preprocessor), ('model', model)])
        joblib.dump(final_pipeline, local_model)
        model_s3_url = upload_model_to_s3(local_model, experiment_id)
        
        # 8. Database Sync
        insert_model_record(experiment_id, algorithm_name, best_params, metrics, feature_importance, model_s3_url)
        update_experiment_status(experiment_id, "COMPLETED")
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Training failed: {e}")
        update_experiment_status(experiment_id, "FAILED", str(e))
        
    finally:
        # Cleanup local files to save disk space
        if os.path.exists(local_csv):
            os.remove(local_csv)
        if os.path.exists(local_model):
            os.remove(local_model)