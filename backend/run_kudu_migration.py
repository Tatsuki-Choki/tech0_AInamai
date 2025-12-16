import subprocess
import json
import urllib.request
import base64
import sys

RESOURCE_GROUP = "rg-001-gen10"
APP_NAME = "koya-app-backend-dev"
CMD = "cd /home/site/wwwroot && export PYTHONPATH=$PYTHONPATH:/home/site/wwwroot && python -m alembic upgrade head && python -m app.db.seed && python -m app.db.seed_demo"



def get_credentials():
    print("Fetching credentials...")
    cmd = [
        "az", "webapp", "deployment", "list-publishing-profiles",
        "--resource-group", RESOURCE_GROUP,
        "--name", APP_NAME,
        "--query", "[?publishMethod=='MSDeploy'].{userName:userName, userPWD:userPWD}"
    ]
    result = subprocess.check_output(cmd)
    creds = json.loads(result)[0]
    return creds['userName'], creds['userPWD']

def run_command(username, password, command):
    # Base URL for Kudu
    base_url = f"https://{APP_NAME}.scm.azurewebsites.net/api"
    
    # Auth
    auth_str = f"{username}:{password}"
    b64_auth = base64.b64encode(auth_str.encode()).decode()
    headers = {
        "Authorization": f"Basic {b64_auth}",
        "Content-Type": "application/json"
    }

    # 1. Test Auth
    print("Testing Kudu connectivity...")
    try:
        req = urllib.request.Request(f"{base_url}/settings", headers=headers)
        with urllib.request.urlopen(req) as res:
            print(f"Auth successful! Status: {res.status}")
    except urllib.error.HTTPError as e:
        print(f"Auth Check Failed: {e.code} {e.reason}")
        return

    # 2. Run Command
    print(f"Running command: {command}")
    data = {
        "command": command,
        "dir": "/home/site/wwwroot"
    }
    
    req = urllib.request.Request(f"{base_url}/command", data=json.dumps(data).encode(), headers=headers, method="POST")
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            print("--- Output ---")
            print(result.get("Output", ""))
            print("--- Error ---")
            print(result.get("Error", ""))
            print(f"Exit Code: {result.get('ExitCode')}")
    except urllib.error.HTTPError as e:
        print(f"HTTP Error: {e.code} {e.reason}")
        print(e.read().decode())
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    try:
        user, pwd = get_credentials()
        # Ensure we run migrations using the correct alembic config and python path
        # Note: alembic.ini is in wwwroot. alembic folder is in wwwroot/backend/alembic?
        # NO. deploy_backend.sh zips 'alembic' folder at root of zip.
        # So in wwwroot, we have: alembic/, app/, alembic.ini, startup.sh
        # So 'cd /home/site/wwwroot && python -m alembic upgrade head' should work IF alembic package is installed.
        # But earlier error said 'No module named alembic.__main__'.
        # Try 'alembic upgrade head' directly if it's in path.
        # Or 'python -m alembic.config upgrade head'?
        # The safest: 'python -c "from alembic.config import main; main()" upgrade head'
        
        SAFE_CMD = 'cd /home/site/wwwroot && export PYTHONPATH=$PYTHONPATH:/home/site/wwwroot && python -c "from alembic.config import main; main()" upgrade head && python -m app.db.seed && python -m app.db.seed_demo'
        
        run_command(user, pwd, SAFE_CMD)
    except Exception as e:
        print(f"Failed: {e}")


