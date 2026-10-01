# Windows 11 Smart App Control & SmartScreen Guide

## Why did Smart App Control block SCRCD?

On Windows 11 (version 22H2 and newer), Microsoft introduced **Smart App Control (SAC)**.

When you download any `.exe` from a web browser (GitHub, Chrome, Edge), Windows attaches an NTFS security tag called **Mark of the Web (Zone.Identifier)** indicating the file originated from the Internet.

Smart App Control blocks any internet-downloaded executable if:
1. It does not possess an expensive commercial Extended Validation (EV) digital certificate from a commercial Certificate Authority ($300-$500/year).
2. It does not yet have established global cloud reputation in Microsoft's Intelligent Security Graph (which takes weeks of thousands of downloads).

Because SCRCD is an independent, 100% offline, privacy-first open-source application, new version releases are temporarily blocked by SAC when launched directly from the Downloads folder.

---

## How to Unblock SCRCD (3 Simple Solutions)

### Solution 1: File Properties Unblock (Fastest & Easiest - 5 seconds)

1. Open **File Explorer** and go to your **Downloads** folder.
2. Right-click **`SCRCD-1.2.1.exe`** (or `SCRCD Setup 1.2.1.exe`) and choose **Properties**.
3. On the **General** tab, look at the bottom **Security** section:
   > *"This file came from another computer and might be blocked to help protect this computer."*
4. Check the **[x] Unblock** box.
5. Click **Apply**, then **OK**.
6. Double-click the file to launch SCRCD!

---

### Solution 2: 1-Click Batch Unblocker (Included in Repository)

We provide a simple helper script in the repository:
1. Download or double-click `tools/Unblock-SCRCD.bat`.
2. It automatically strips the Mark of the Web (`Zone.Identifier`) from all SCRCD binaries in your Downloads folder.
3. Launch SCRCD immediately.

Or run this single command in **PowerShell**:
```powershell
Unblock-File "$HOME\Downloads\*SCRCD*.exe"
```

---

### Solution 3: Use the Windows Setup Installer (Recommended)

Download and run **`SCRCD-Setup-*.exe`**. The installer installs the application locally into your user profile (`%LOCALAPPDATA%\Programs\scrcd`). Because it is an installed program rather than a standalone Internet download, the desktop and Start Menu shortcuts execute cleanly without Mark of the Web hurdles!

---

### For Enterprise & Corporate Environments

If you manage a fleet of Windows devices or work in a restricted corporate environment:
- Add an application exclusion in **Windows Security** -> **Virus & threat protection** -> **Manage settings** -> **Exclusions** -> **Folder** for your SCRCD installation directory.
- Alternatively, organizations can whitelist SCRCD via AppLocker or Microsoft Intune/Defender Application Control (WDAC).
