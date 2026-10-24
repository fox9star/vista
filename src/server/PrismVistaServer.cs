using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;

namespace PrismVistaServer
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.Title = "PrismVista 3D Web Server";
            Console.OutputEncoding = Encoding.UTF8;

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string webRoot = Path.Combine(baseDir, "app");
            if (!Directory.Exists(webRoot))
            {
                webRoot = Path.Combine(baseDir, "dist");
            }
            if (!Directory.Exists(webRoot))
            {
                webRoot = Path.Combine(baseDir, "src", "app");
            }
            if (!Directory.Exists(webRoot))
            {
                webRoot = baseDir; // fallback
            }

            int port = 8080;
            HttpListener listener = null;

            while (port < 8095)
            {
                try
                {
                    listener = new HttpListener();
                    listener.Prefixes.Add("http://localhost:" + port + "/");
                    listener.Prefixes.Add("http://127.0.0.1:" + port + "/");
                    listener.Start();
                    break;
                }
                catch
                {
                    listener.Close();
                    listener = null;
                    port++;
                }
            }

            if (listener == null)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("[오류] 사용 가능한 웹 서버 포트(8080~8095)를 바인딩할 수 없습니다.");
                Console.ResetColor();
                Console.WriteLine("아무 키나 누르면 종료합니다...");
                Console.ReadKey();
                return;
            }

            string localUrl = "http://localhost:" + port + "/";
            string lanIp = GetLocalIPAddress();
            string networkUrl = lanIp != null ? ("http://" + lanIp + ":" + port + "/") : null;

            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("==================================================================");
            Console.WriteLine("        PrismVista 3D Web Server (실시간 웹 3D 렌더러 서버)       ");
            Console.WriteLine("==================================================================");
            Console.ResetColor();
            Console.WriteLine();
            Console.WriteLine("  [웹 브라우저 접속 주소]");
            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("  ▶ 로컬 PC 접속      : " + localUrl);
            if (networkUrl != null)
            {
                Console.WriteLine("  ▶ 동일 Wi-Fi/네트워크: " + networkUrl);
            }
            Console.ResetColor();
            Console.WriteLine();
            Console.WriteLine("  웹 루트 디렉터리    : " + webRoot);
            Console.WriteLine("------------------------------------------------------------------");
            Console.WriteLine("  * 기본 웹 브라우저를 자동으로 실행합니다...");
            Console.WriteLine("  * 서버를 종료하려면 이 창을 닫거나 Ctrl + C를 누르십시오.");
            Console.WriteLine("==================================================================");
            Console.WriteLine();

            // Automatically open web browser
            try
            {
                Process.Start(new ProcessStartInfo(localUrl) { UseShellExecute = true });
            }
            catch { }

            // Request processing loop
            while (listener.IsListening)
            {
                try
                {
                    HttpListenerContext context = listener.GetContext();
                    ThreadPool.QueueUserWorkItem((ctx) => ProcessRequest((HttpListenerContext)ctx, webRoot), context);
                }
                catch
                {
                    break;
                }
            }
        }

        static void ProcessRequest(HttpListenerContext context, string webRoot)
        {
            HttpListenerRequest request = context.Request;
            HttpListenerResponse response = context.Response;

            try
            {
                string rawUrl = request.Url.AbsolutePath;
                if (rawUrl == "/" || string.IsNullOrEmpty(rawUrl))
                {
                    rawUrl = "/index.html";
                }

                string relativePath = rawUrl.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
                string filePath = Path.Combine(webRoot, relativePath);

                // Prevent path traversal
                string fullPath = Path.GetFullPath(filePath);
                string fullWebRoot = Path.GetFullPath(webRoot);

                if (!fullPath.StartsWith(fullWebRoot, StringComparison.OrdinalIgnoreCase) || !File.Exists(fullPath))
                {
                    response.StatusCode = 404;
                    byte[] notFoundBytes = Encoding.UTF8.GetBytes("404 Not Found - PrismVista 3D");
                    response.ContentType = "text/plain; charset=utf-8";
                    response.ContentLength64 = notFoundBytes.Length;
                    response.OutputStream.Write(notFoundBytes, 0, notFoundBytes.Length);
                    response.OutputStream.Close();
                    return;
                }

                string ext = Path.GetExtension(fullPath).ToLower();
                string contentType = "application/octet-stream";
                switch (ext)
                {
                    case ".html":
                    case ".htm":
                        contentType = "text/html; charset=utf-8";
                        break;
                    case ".css":
                        contentType = "text/css; charset=utf-8";
                        break;
                    case ".js":
                        contentType = "application/javascript; charset=utf-8";
                        break;
                    case ".json":
                        contentType = "application/json; charset=utf-8";
                        break;
                    case ".png":
                        contentType = "image/png";
                        break;
                    case ".jpg":
                    case ".jpeg":
                        contentType = "image/jpeg";
                        break;
                    case ".svg":
                        contentType = "image/svg+xml";
                        break;
                    case ".obj":
                    case ".txt":
                        contentType = "text/plain; charset=utf-8";
                        break;
                }

                byte[] fileBytes = File.ReadAllBytes(fullPath);
                response.ContentType = contentType;
                response.ContentLength64 = fileBytes.Length;
                response.StatusCode = 200;

                // Cache headers for fast client loading
                response.Headers.Add("Cache-Control", "no-cache");
                response.Headers.Add("Access-Control-Allow-Origin", "*");

                response.OutputStream.Write(fileBytes, 0, fileBytes.Length);
                response.OutputStream.Close();

                Console.WriteLine(string.Format("[{0:HH:mm:ss}] 200 OK: {1}", DateTime.Now, rawUrl));
            }
            catch (Exception ex)
            {
                try
                {
                    response.StatusCode = 500;
                    byte[] errBytes = Encoding.UTF8.GetBytes("500 Server Error: " + ex.Message);
                    response.OutputStream.Write(errBytes, 0, errBytes.Length);
                    response.OutputStream.Close();
                }
                catch { }
            }
        }

        static string GetLocalIPAddress()
        {
            try
            {
                using (Socket socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, 0))
                {
                    socket.Connect("8.8.8.8", 65530);
                    IPEndPoint endPoint = socket.LocalEndPoint as IPEndPoint;
                    return endPoint.Address.ToString();
                }
            }
            catch
            {
                return null;
            }
        }
    }
}

