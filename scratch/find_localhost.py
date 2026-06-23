import os

exclude_dirs = {'.venv', 'venv', '.git', 'node_modules', 'scratch', '__pycache__', 'dist', 'build'}
exclude_files = {'backend_tunnel.log', 'frontend_tunnel.log', 'backend_tunnel_err.log', 'frontend_tunnel_err.log', 'find_localhost.py', 'search_results.txt'}

def scan_files(root_dir):
    matches = []
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # modify dirnames in place to skip excluded directories
        dirnames[:] = [d for d in dirnames if d not in exclude_dirs]
        for filename in filenames:
            if filename in exclude_files:
                continue
            filepath = os.path.join(dirpath, filename)
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    for line_num, line in enumerate(f, 1):
                        if 'localhost' in line.lower():
                            matches.append((filepath, line_num, line.strip()))
            except Exception as e:
                pass
    return matches

if __name__ == '__main__':
    workspace = r'c:\Users\sgsqa4\.gemini\antigravity\training-platform'
    results = scan_files(workspace)
    
    out_path = os.path.join(workspace, 'scratch', 'search_results.txt')
    with open(out_path, 'w', encoding='utf-8') as out_f:
        out_f.write(f"Found {len(results)} matches:\n")
        for path, line_num, content in results:
            rel_path = os.path.relpath(path, workspace)
            out_f.write(f"{rel_path}:{line_num}: {content}\n")
    print(f"Done scanning. Found {len(results)} matches. Results written to {out_path}")
