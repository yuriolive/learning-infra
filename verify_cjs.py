import json
import os

packages = [
    "packages/medusa/plugins/ai/agent",
    "packages/medusa/plugins/erp/bling",
    "packages/medusa/plugins/payment/mercadopago",
    "packages/medusa/plugins/search/neon",
    "packages/analytics",
    "packages/logger",
    "packages/utils",
]

for pkg_path in packages:
    pkg_json_path = os.path.join(pkg_path, "package.json")
    if os.path.exists(pkg_json_path):
        with open(pkg_json_path, "r") as f:
            data = json.load(f)

        if "type" in data and data["type"] == "module":
            print(f"FIXING: {pkg_json_path} has type: module")
            del data["type"]
            with open(pkg_json_path, "w") as f:
                json.dump(data, f, indent=2)
                f.write("\n")
        else:
            print(f"OK: {pkg_json_path} is CJS")

    tsconfig_path = os.path.join(pkg_path, "tsconfig.json")
    if os.path.exists(tsconfig_path):
        with open(tsconfig_path, "r") as f:
            try:
                ts_data = json.load(f)
            except:
                print(f"SKIP: {tsconfig_path} (invalid json or comments)")
                continue

        changed = False
        if "compilerOptions" not in ts_data:
            ts_data["compilerOptions"] = {}

        if ts_data["compilerOptions"].get("module") != "NodeNext":
            print(f"FIXING: {tsconfig_path} module is {ts_data['compilerOptions'].get('module')}")
            ts_data["compilerOptions"]["module"] = "NodeNext"
            changed = True

        if ts_data["compilerOptions"].get("moduleResolution") != "NodeNext":
            print(f"FIXING: {tsconfig_path} moduleResolution is {ts_data['compilerOptions'].get('moduleResolution')}")
            ts_data["compilerOptions"]["moduleResolution"] = "NodeNext"
            changed = True

        if changed:
            with open(tsconfig_path, "w") as f:
                json.dump(ts_data, f, indent=2)
                f.write("\n")
        else:
            print(f"OK: {tsconfig_path}")
