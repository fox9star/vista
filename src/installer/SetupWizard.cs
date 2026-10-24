using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

namespace PrismVistaInstaller
{
    public class SetupWizardForm : Form
    {
        private Panel bannerPanel;
        private Label bannerTitle;
        private Label bannerSubtitle;

        private Panel contentPanel;
        private Panel footerPanel;
        private Button btnCancel;
        private Button btnBack;
        private Button btnNext;

        private int currentStep = 0;

        // Step 0: Welcome & License
        private Panel step0Panel;
        private CheckBox chkLicense;

        // Step 1: Destination
        private Panel step1Panel;
        private TextBox txtInstallPath;
        private Button btnBrowse;

        // Step 2: Shortcuts
        private Panel step2Panel;
        private CheckBox chkDesktopShortcut;
        private CheckBox chkStartMenuShortcut;

        // Step 3: Installing Progress
        private Panel step3Panel;
        private ProgressBar progressBar;
        private Label lblInstallStatus;

        // Step 4: Complete
        private Panel step4Panel;
        private CheckBox chkLaunchNow;

        private string installDir;

        public SetupWizardForm()
        {
            InitializeComponent();
            ShowStep(0);
        }

        private void InitializeComponent()
        {
            this.Text = "PrismVista 3D 설치 관리자 (Setup)";
            this.Size = new Size(580, 460);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = true;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(245, 247, 250);
            this.Font = new Font("Malgun Gothic", 9F, FontStyle.Regular);

            // Banner
            bannerPanel = new Panel();
            bannerPanel.Dock = DockStyle.Top;
            bannerPanel.Height = 72;
            bannerPanel.BackColor = Color.FromArgb(22, 24, 33);
            bannerPanel.Paint += (s, e) =>
            {
                using (Brush b = new SolidBrush(Color.FromArgb(121, 40, 202)))
                {
                    e.Graphics.FillRectangle(b, 0, bannerPanel.Height - 3, bannerPanel.Width, 3);
                }
            };

            bannerTitle = new Label();
            bannerTitle.Text = "PrismVista 3D 렌더러 설치 마법사";
            bannerTitle.Font = new Font("Malgun Gothic", 12F, FontStyle.Bold);
            bannerTitle.ForeColor = Color.White;
            bannerTitle.Location = new Point(20, 14);
            bannerTitle.AutoSize = true;

            bannerSubtitle = new Label();
            bannerSubtitle.Text = "실시간 PBR 레이 트레이싱 & 3D 건축 시각화 프로그램";
            bannerSubtitle.Font = new Font("Malgun Gothic", 8.5F);
            bannerSubtitle.ForeColor = Color.FromArgb(160, 174, 192);
            bannerSubtitle.Location = new Point(22, 38);
            bannerSubtitle.AutoSize = true;

            bannerPanel.Controls.Add(bannerTitle);
            bannerPanel.Controls.Add(bannerSubtitle);

            // Footer
            footerPanel = new Panel();
            footerPanel.Dock = DockStyle.Bottom;
            footerPanel.Height = 52;
            footerPanel.BackColor = Color.FromArgb(237, 242, 247);

            btnCancel = new Button();
            btnCancel.Text = "취소";
            btnCancel.Size = new Size(82, 28);
            btnCancel.Location = new Point(470, 12);
            btnCancel.Click += (s, e) => this.Close();

            btnNext = new Button();
            btnNext.Text = "다음(N) >";
            btnNext.Size = new Size(86, 28);
            btnNext.Location = new Point(378, 12);
            btnNext.Click += (s, e) => OnNextClicked();

            btnBack = new Button();
            btnBack.Text = "< 이전(B)";
            btnBack.Size = new Size(82, 28);
            btnBack.Location = new Point(290, 12);
            btnBack.Click += (s, e) => OnBackClicked();

            footerPanel.Controls.Add(btnBack);
            footerPanel.Controls.Add(btnNext);
            footerPanel.Controls.Add(btnCancel);

            // Content Container
            contentPanel = new Panel();
            contentPanel.Dock = DockStyle.Fill;
            contentPanel.Padding = new Padding(25, 20, 25, 20);

            // Setup Steps Panels
            InitStep0();
            InitStep1();
            InitStep2();
            InitStep3();
            InitStep4();

            this.Controls.Add(contentPanel);
            this.Controls.Add(bannerPanel);
            this.Controls.Add(footerPanel);
        }

        private void InitStep0()
        {
            step0Panel = new Panel { Dock = DockStyle.Fill };

            Label lblWelcome = new Label
            {
                Text = "PrismVista 3D 설치를 시작합니다.\n\n이 프로그램은 실시간 PBR 광원 계산, 태양광 및 대기 환경 조절, 3D 모델(OBJ) 가져오기, 시네마틱 톤매핑 및 고화질 렌더링 내보내기를 지원하는 3D 시각화 스튜디오입니다.",
                Location = new Point(10, 10),
                Size = new Size(490, 80),
                Font = new Font("Malgun Gothic", 9.5F)
            };

            TextBox txtEula = new TextBox
            {
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Vertical,
                BackColor = Color.White,
                Location = new Point(10, 95),
                Size = new Size(490, 140),
                Font = new Font("Consolas", 8.5F),
                Text = "PRISMVISTA 3D END USER LICENSE AGREEMENT\r\n\r\n1. 본 소프트웨어(PrismVista 3D)는 개인 학습, 연구 및 3D 실시간 렌더링 시각화를 위해 자유롭게 사용 및 수정할 수 있습니다.\r\n2. 오프라인 단독 환경에서 실행되며 외부 네트워크 전송 없이 안전하게 작동합니다.\r\n3. 하드웨어 가속(GPU) 및 WebGL 2.0 엔진을 통해 고해상도 이미지 렌더링을 제공합니다.\r\n4. 본 설치 프로그램은 시스템 파일을 훼손하지 않으며 언제든지 제어판 또는 제거 프로그램을 통해 안전하게 삭제할 수 있습니다."
            };

            chkLicense = new CheckBox
            {
                Text = "소프트웨어 사용 조건 및 라이선스에 동의합니다(A)",
                Location = new Point(10, 245),
                Size = new Size(400, 24),
                Checked = true
            };

            step0Panel.Controls.Add(lblWelcome);
            step0Panel.Controls.Add(txtEula);
            step0Panel.Controls.Add(chkLicense);
        }

        private void InitStep1()
        {
            step1Panel = new Panel { Dock = DockStyle.Fill };

            string defaultPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "PrismVista"
            );

            Label lblDir = new Label
            {
                Text = "PrismVista 3D를 설치할 대상 폴더를 선택하십시오.\n\n설치 마법사가 아래 지정된 폴더에 프로그램을 설치합니다.",
                Location = new Point(10, 15),
                Size = new Size(490, 50)
            };

            Label lblPath = new Label
            {
                Text = "설치 대상 폴더:",
                Location = new Point(10, 75),
                Size = new Size(120, 20),
                Font = new Font("Malgun Gothic", 9F, FontStyle.Bold)
            };

            txtInstallPath = new TextBox
            {
                Text = defaultPath,
                Location = new Point(10, 98),
                Size = new Size(390, 24)
            };

            btnBrowse = new Button
            {
                Text = "찾아보기...",
                Location = new Point(410, 96),
                Size = new Size(90, 27)
            };
            btnBrowse.Click += (s, e) =>
            {
                using (FolderBrowserDialog fbd = new FolderBrowserDialog())
                {
                    fbd.SelectedPath = txtInstallPath.Text;
                    if (fbd.ShowDialog() == DialogResult.OK)
                    {
                        txtInstallPath.Text = fbd.SelectedPath;
                    }
                }
            };

            Label lblSpace = new Label
            {
                Text = "필요한 디스크 공간: 약 15 MB\r\n사용 가능한 디스크 공간: 충분함",
                Location = new Point(10, 150),
                Size = new Size(400, 40),
                ForeColor = Color.FromArgb(100, 110, 120)
            };

            step1Panel.Controls.Add(lblDir);
            step1Panel.Controls.Add(lblPath);
            step1Panel.Controls.Add(txtInstallPath);
            step1Panel.Controls.Add(btnBrowse);
            step1Panel.Controls.Add(lblSpace);
        }

        private void InitStep2()
        {
            step2Panel = new Panel { Dock = DockStyle.Fill };

            Label lblOptions = new Label
            {
                Text = "설치 시 생성할 바로가기 및 추가 작업을 선택하십시오.\n",
                Location = new Point(10, 15),
                Size = new Size(490, 40)
            };

            chkDesktopShortcut = new CheckBox
            {
                Text = "바탕 화면에 PrismVista 3D 바로가기 아이콘 생성(D)",
                Location = new Point(20, 65),
                Size = new Size(400, 24),
                Checked = true
            };

            chkStartMenuShortcut = new CheckBox
            {
                Text = "시작 메뉴 프로그램 목록에 등록(S)",
                Location = new Point(20, 95),
                Size = new Size(400, 24),
                Checked = true
            };

            step2Panel.Controls.Add(lblOptions);
            step2Panel.Controls.Add(chkDesktopShortcut);
            step2Panel.Controls.Add(chkStartMenuShortcut);
        }

        private void InitStep3()
        {
            step3Panel = new Panel { Dock = DockStyle.Fill };

            Label lblInstalling = new Label
            {
                Text = "PrismVista 3D 파일을 설치하는 중입니다...\n잠시만 기다려 주십시오.",
                Location = new Point(10, 20),
                Size = new Size(490, 40)
            };

            progressBar = new ProgressBar
            {
                Location = new Point(10, 75),
                Size = new Size(490, 24),
                Minimum = 0,
                Maximum = 100,
                Value = 0
            };

            lblInstallStatus = new Label
            {
                Text = "설치 준비 중...",
                Location = new Point(10, 110),
                Size = new Size(490, 25),
                ForeColor = Color.FromArgb(70, 80, 95)
            };

            step3Panel.Controls.Add(lblInstalling);
            step3Panel.Controls.Add(progressBar);
            step3Panel.Controls.Add(lblInstallStatus);
        }

        private void InitStep4()
        {
            step4Panel = new Panel { Dock = DockStyle.Fill };

            Label lblDone = new Label
            {
                Text = "PrismVista 3D 설치가 성공적으로 완료되었습니다!",
                Location = new Point(10, 20),
                Size = new Size(490, 30),
                Font = new Font("Malgun Gothic", 11F, FontStyle.Bold),
                ForeColor = Color.FromArgb(121, 40, 202)
            };

            Label lblDoneDesc = new Label
            {
                Text = "컴퓨터에 PrismVista 3D가 성공적으로 설치되었습니다.\n바탕 화면 바로가기 또는 시작 메뉴를 통해 언제든지 실행하실 수 있습니다.\n\n[마침] 단추를 누르면 설치 마법사가 종료됩니다.",
                Location = new Point(10, 60),
                Size = new Size(490, 80)
            };

            chkLaunchNow = new CheckBox
            {
                Text = "PrismVista 3D 지금 실행하기(L)",
                Location = new Point(15, 160),
                Size = new Size(350, 25),
                Checked = true,
                Font = new Font("Malgun Gothic", 9.5F, FontStyle.Bold)
            };

            step4Panel.Controls.Add(lblDone);
            step4Panel.Controls.Add(lblDoneDesc);
            step4Panel.Controls.Add(chkLaunchNow);
        }

        private void ShowStep(int step)
        {
            currentStep = step;
            contentPanel.Controls.Clear();

            btnBack.Enabled = (step > 0 && step < 3);
            btnNext.Enabled = true;
            btnCancel.Enabled = (step != 3);

            if (step == 0)
            {
                contentPanel.Controls.Add(step0Panel);
                btnNext.Text = "다음(N) >";
            }
            else if (step == 1)
            {
                contentPanel.Controls.Add(step1Panel);
                btnNext.Text = "다음(N) >";
            }
            else if (step == 2)
            {
                contentPanel.Controls.Add(step2Panel);
                btnNext.Text = "설치(I)";
            }
            else if (step == 3)
            {
                contentPanel.Controls.Add(step3Panel);
                btnBack.Enabled = false;
                btnNext.Enabled = false;
                btnCancel.Enabled = false;
                StartInstallation();
            }
            else if (step == 4)
            {
                contentPanel.Controls.Add(step4Panel);
                btnBack.Visible = false;
                btnCancel.Visible = false;
                btnNext.Text = "마침(F)";
            }
        }

        private void OnNextClicked()
        {
            if (currentStep == 0)
            {
                if (!chkLicense.Checked)
                {
                    MessageBox.Show("라이선스 사용 조건에 동의해야 설치를 진행할 수 있습니다.", "알림", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }
                ShowStep(1);
            }
            else if (currentStep == 1)
            {
                if (string.IsNullOrWhiteSpace(txtInstallPath.Text))
                {
                    MessageBox.Show("설치할 대상 경로를 지정하십시오.", "알림", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                    return;
                }
                installDir = txtInstallPath.Text.Trim();
                ShowStep(2);
            }
            else if (currentStep == 2)
            {
                ShowStep(3);
            }
            else if (currentStep == 4)
            {
                if (chkLaunchNow.Checked)
                {
                    string exePath = Path.Combine(installDir, "PrismVista.exe");
                    if (File.Exists(exePath))
                    {
                        Process.Start(new ProcessStartInfo(exePath) { UseShellExecute = true });
                    }
                }
                this.Close();
            }
        }

        private void OnBackClicked()
        {
            if (currentStep > 0 && currentStep < 3)
            {
                ShowStep(currentStep - 1);
            }
        }

        private void StartInstallation()
        {
            Thread installThread = new Thread(() =>
            {
                try
                {
                    UpdateStatus("설치 디렉터리 생성 중...", 15);
                    Directory.CreateDirectory(installDir);
                    Thread.Sleep(200);

                    UpdateStatus("프로그램 리소스 압축 해제 중...", 40);
                    ExtractPayload(installDir);
                    Thread.Sleep(300);

                    UpdateStatus("바로가기 아이콘 등록 중...", 75);
                    string targetExe = Path.Combine(installDir, "PrismVista.exe");

                    if (chkDesktopShortcut.Checked)
                    {
                        string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                        CreateShortcut(Path.Combine(desktopPath, "PrismVista 3D.lnk"), targetExe, "PrismVista 3D Real-time Renderer");
                    }

                    if (chkStartMenuShortcut.Checked)
                    {
                        string startMenuFolder = Path.Combine(
                            Environment.GetFolderPath(Environment.SpecialFolder.Programs),
                            "PrismVista 3D"
                        );
                        Directory.CreateDirectory(startMenuFolder);
                        CreateShortcut(Path.Combine(startMenuFolder, "PrismVista 3D.lnk"), targetExe, "PrismVista 3D Real-time Renderer");
                        CreateShortcut(Path.Combine(startMenuFolder, "PrismVista 3D 제거.lnk"), Path.Combine(installDir, "Uninstall.exe"), "PrismVista 3D 제거");
                    }

                    UpdateStatus("설치 완료 중...", 100);
                    Thread.Sleep(300);

                    this.Invoke((Action)(() => ShowStep(4)));
                }
                catch (Exception ex)
                {
                    this.Invoke((Action)(() =>
                    {
                        MessageBox.Show("설치 도중 오류가 발생했습니다: " + ex.Message, "설치 오류", MessageBoxButtons.OK, MessageBoxIcon.Error);
                        btnCancel.Enabled = true;
                    }));
                }
            });
            installThread.IsBackground = true;
            installThread.Start();
        }

        private void UpdateStatus(string text, int percent)
        {
            if (this.InvokeRequired)
            {
                this.Invoke((Action)(() => UpdateStatus(text, percent)));
                return;
            }
            lblInstallStatus.Text = text;
            progressBar.Value = percent;
        }

        private void ExtractPayload(string destDir)
        {
            Assembly asm = Assembly.GetExecutingAssembly();
            using (Stream resStream = asm.GetManifestResourceStream("PrismVistaPayload.zip"))
            {
                if (resStream == null)
                {
                    throw new InvalidOperationException("Embedded installation payload not found.");
                }

                using (ZipArchive archive = new ZipArchive(resStream, ZipArchiveMode.Read))
                {
                    foreach (ZipArchiveEntry entry in archive.Entries)
                    {
                        string fullPath = Path.Combine(destDir, entry.FullName);
                        if (string.IsNullOrEmpty(entry.Name))
                        {
                            Directory.CreateDirectory(fullPath);
                        }
                        else
                        {
                            Directory.CreateDirectory(Path.GetDirectoryName(fullPath));
                            entry.ExtractToFile(fullPath, true);
                        }
                    }
                }
            }
        }

        private void CreateShortcut(string shortcutPath, string targetPath, string description)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType != null)
                {
                    dynamic shell = Activator.CreateInstance(shellType);
                    dynamic shortcut = shell.CreateShortcut(shortcutPath);
                    shortcut.TargetPath = targetPath;
                    shortcut.WorkingDirectory = Path.GetDirectoryName(targetPath);
                    shortcut.Description = description;
                    shortcut.Save();
                }
            }
            catch { }
        }

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new SetupWizardForm());
        }
    }
}
