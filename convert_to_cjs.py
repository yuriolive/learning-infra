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

        print(f"Processing {pkg_json_path}")

        # Action A: Modify package.json
        if "type" in data:
            del data["type"]
            print("  Removed 'type'")

        data["main"] = "dist/index.js"
        data["types"] = "dist/index.d.ts"
        print("  Set main and types")

        if "exports" in data:
            new_exports = {}
            for key, value in data["exports"].items():
                # Handle simple string export
                target = None
                if isinstance(value, str):
                   target = value
                elif isinstance(value, dict):
                    # Prioritize require, then import, then default
                    if "require" in value:
                        target = value["require"]
                    elif "import" in value:
                        target = value["import"]
                    elif "default" in value:
                        target = value["default"]

                if target:
                    # Fix path: src/*.ts -> dist/*.js
                    if target.startswith("./src/") and target.endswith(".ts"):
                        target = target.replace("./src/", "./dist/").replace(".ts", ".js")
                    elif target.startswith("./src/") and target.endswith(".tsx"):
                        target = target.replace("./src/", "./dist/").replace(".tsx", ".js")

                    # Ensure it points to dist
                    if not target.startswith("./dist/") and not target.startswith("dist/"):
                         # special case for package.json
                         if target == "./package.json":
                             pass
                         else:
                             print(f"  Warning: Target {target} does not start with ./dist/")

                    new_exports[key] = target

            # For plugins, instruction says "Remove 'exports' ... Simple 'main' is safer".
            # But for utils/logger/analytics, we might need them.
            # Let's keep simplified exports for everyone to be safe but consistent.
            # If the only export is "." -> "./dist/index.js", we can remove it as main covers it.

            if len(new_exports) == 1 and "." in new_exports and new_exports["."] == "./dist/index.js":
                del data["exports"]
                print("  Removed single '.' export")
            else:
                data["exports"] = new_exports
                print(f"  Simplified exports: {new_exports}")

        with open(pkg_json_path, "w") as f:
            json.dump(data, f, indent=2)
            f.write("\n") # Add newline

    # Action B: Modify tsconfig.json
    tsconfig_path = os.path.join(pkg_path, "tsconfig.json")
    if os.path.exists(tsconfig_path):
        with open(tsconfig_path, "r") as f:
            # handle comments in json if any? Python json lib is strict.
            # Assuming standard JSON. If fails, I'll fix.
            try:
                ts_data = json.load(f)
            except json.JSONDecodeError:
                print(f"  Error reading {tsconfig_path}, might contain comments.")
                continue

        print(f"Processing {tsconfig_path}")

        if "compilerOptions" not in ts_data:
            ts_data["compilerOptions"] = {}

        ts_data["compilerOptions"]["module"] = "CommonJS"
        ts_data["compilerOptions"]["moduleResolution"] = "Node"
        ts_data["compilerOptions"]["outDir"] = "dist" # Ensure outDir is set

        # Remove esModuleInterop if it conflicts? No, it's fine.

        with open(tsconfig_path, "w") as f:
            json.dump(ts_data, f, indent=2)
            f.write("\n")
