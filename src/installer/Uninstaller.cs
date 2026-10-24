using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

namespace PrismVistaInstaller
{
    static class UninstallerProgram
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            DialogResult confirm = MessageBox.Show(
                "PrismVista 3D 렌더러를 컴퓨터에서 완전히 제거하시겠습니까?",
                "PrismVista 3D 제거 확인",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question
            );

            if (confirm != DialogResult.Yes)
            {
                return;
            }

            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\');

                // 1. Remove Desktop Shortcut
                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string desktopShortcut = Path.Combine(desktopPath, "PrismVista 3D.lnk");
                if (File.Exists(desktopShortcut))
                {
                    File.Delete(desktopShortcut);
                }

                // 2. Remove Start Menu Shortcut
                string startMenuPath = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.Programs),
                    "PrismVista 3D"
                );
                if (Directory.Exists(startMenuPath))
                {
                    Directory.Delete(startMenuPath, true);
                }

                // 3. Self-delete batch command for the installation folder
                string batchScript = string.Format(
                    "/c ping 127.0.0.1 -n 2 > nul & rmdir /s /q \"{0}\"",
                    baseDir
                );

                ProcessStartInfo psi = new ProcessStartInfo("cmd.exe", batchScript)
                {
                    CreateNoWindow = true,
                    UseShellExecute = false
                };
                Process.Start(psi);

                MessageBox.Show(
                    "PrismVista 3D가 시스템에서 성공적으로 제거되었습니다.",
                    "제거 완료",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information
                );
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "제거 중 오류가 발생했습니다: " + ex.Message,
                    "제거 오류",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
            }
        }
    }
}
