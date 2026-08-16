#!/usr/bin/env python3
"""
1-Click Studio Launcher & Relay Server Runner
Location: companion_studio/run_studio.py
Starts server and opens Studio Pro UI in default browser.
"""
import sys
import os
import webbrowser
import time
import subprocess

def main():
    print("=" * 66)
    print(" LAUNCHING VIRAJVERSE COMPANION STUDIO PRO (ROOT SUITE)")
    print("=" * 66)
    
    suite_dir = os.path.dirname(__file__)
    server_script = os.path.join(suite_dir, "server.py")
    
    # Auto-open browser after 1.5 seconds
    def open_browser():
        time.sleep(1.5)
        webbrowser.open("http://localhost:8080/")
    
    import threading
    threading.Thread(target=open_browser, daemon=True).start()

    print("🚀 Studio Web UI starting at: http://localhost:8080/")
    subprocess.run([sys.executable, server_script])

if __name__ == "__main__":
    main()
