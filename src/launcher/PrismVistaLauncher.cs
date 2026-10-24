using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace PrismVista
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string htmlPath = Path.Combine(baseDir, "app", "index.html");

                if (!File.Exists(htmlPath))
                {
                    htmlPath = Path.Combine(baseDir, "index.html");
                }

                if (!File.Exists(htmlPath))
                {
                    MessageBox.Show(
                        "PrismVista 3D application files were not found at:\n" + htmlPath,
                        "PrismVista Launch Error",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Error
                    );
                    return;
                }

                string fileUri = "file:///" + htmlPath.Replace('\\', '/');

                string[] browserCandidates = new string[]
                {
                    @"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                    @"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                    @"C:\Program Files\Google\Chrome\Application\chrome.exe",
                    @"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Microsoft\Edge\Application\msedge.exe"),
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Google\Chrome\Application\chrome.exe")
                };

                string chosenBrowser = null;
                foreach (string path in browserCandidates)
                {
                    if (File.Exists(path))
                    {
                        chosenBrowser = path;
                        break;
                    }
                }

                if (chosenBrowser != null)
                {
                    string profileDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "PrismVista", "AppData");
                    Directory.CreateDirectory(profileDir);

                    string arguments = string.Format(
                        "--app=\"{0}\" --window-size=1600,950 --user-data-dir=\"{1}\" --enable-gpu-rasterization --enable-zero-copy --ignore-gpu-blocklist --disable-pinch",
                        fileUri,
                        profileDir
                    );

                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = chosenBrowser,
                        Arguments = arguments,
                        UseShellExecute = false
                    };
                    Process.Start(psi);
                }
                else
                {
                    Process.Start(new ProcessStartInfo(fileUri) { UseShellExecute = true });
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "Error launching PrismVista 3D:\n" + ex.Message,
                    "PrismVista",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }
    }
}

