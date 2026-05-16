#!/usr/bin/env python3
"""
启动本地 HTTP 服务器用于测试 Webapp
解决 ES Module 在 file:// 协议下的 CORS 问题
"""

import http.server
import socketserver
import os
import webbrowser

PORT = 8080

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def log_message(self, format, *args):
        # 简化日志输出
        print(f"  [{self.log_date_time_string()}] {args[0]}")

# 切换到 webapp 目录
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"=" * 50)
    print(f"  PPT Deck Pro Max 本地服务器已启动")
    print(f"  访问地址: http://localhost:{PORT}")
    print(f"  按 Ctrl+C 停止服务器")
    print(f"=" * 50)

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  服务器已停止")
