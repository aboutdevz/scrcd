Add-Type -AssemblyName System.Drawing

function Draw-ScrcdLogo([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $scale = $size / 32.0

    # 1. Outer rounded rectangle plate
    $plateRect = New-Object System.Drawing.RectangleF(
        (2.0 * $scale), (2.0 * $scale), (28.0 * $scale), (28.0 * $scale)
    )
    $radius = 7.0 * $scale

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diameter = $radius * 2
    $arc = New-Object System.Drawing.RectangleF($plateRect.X, $plateRect.Y, $diameter, $diameter)
    $path.AddArc($arc, 180, 90)
    $arc.X = $plateRect.Right - $diameter
    $path.AddArc($arc, 270, 90)
    $arc.Y = $plateRect.Bottom - $diameter
    $path.AddArc($arc, 0, 90)
    $arc.X = $plateRect.Left
    $path.AddArc($arc, 90, 90)
    $path.CloseFigure()

    $gradBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $plateRect,
        [System.Drawing.Color]::FromArgb(255, 59, 130, 246),
        [System.Drawing.Color]::FromArgb(255, 29, 78, 216),
        45.0
    )
    $g.FillPath($gradBrush, $path)

    # 2. Document lines
    $linePen = New-Object System.Drawing.Pen(
        [System.Drawing.Color]::FromArgb(115, 255, 255, 255),
        (1.8 * $scale)
    )
    $linePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $linePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $g.DrawLine($linePen, (8.0 * $scale), (8.5 * $scale), (18.0 * $scale), (8.5 * $scale))
    $g.DrawLine($linePen, (8.0 * $scale), (12.5 * $scale), (14.0 * $scale), (12.5 * $scale))

    # 3. Aperture lens circle
    $lensR = 6.5 * $scale
    $lensCX = 19.0 * $scale
    $lensCY = 19.0 * $scale
    $lensRect = New-Object System.Drawing.RectangleF(
        ($lensCX - $lensR), ($lensCY - $lensR), ($lensR * 2), ($lensR * 2)
    )
    $lensBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 15, 23, 42))
    $g.FillEllipse($lensBrush, $lensRect)

    $lensPen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, (2.0 * $scale))
    $g.DrawEllipse($lensPen, $lensRect)

    # 4. Recording dot
    $dotR = 3.0 * $scale
    $dotRect = New-Object System.Drawing.RectangleF(
        ($lensCX - $dotR), ($lensCY - $dotR), ($dotR * 2), ($dotR * 2)
    )
    $dotGrad = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $dotRect,
        [System.Drawing.Color]::FromArgb(255, 245, 158, 11),
        [System.Drawing.Color]::FromArgb(255, 239, 68, 68),
        45.0
    )
    $g.FillEllipse($dotGrad, $dotRect)

    $g.Dispose()
    return $bmp
}

$sizes = @(256, 128, 64, 48, 32, 16)
$pngDataList = @()

foreach ($sz in $sizes) {
    $bmp = Draw-ScrcdLogo $sz
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $ms.ToArray()
    $pngDataList += @{ Size = $sz; Bytes = $bytes }
    $ms.Dispose()
    $bmp.Dispose()
}

# Save 256x256 and 512x512 PNGs
$bmp512 = Draw-ScrcdLogo 512
$bmp512.Save("public/icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp512.Save("public/favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp512.Save("electron/icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp512.Dispose()

# Build multi-resolution ICO file
$icoStream = New-Object System.IO.MemoryStream
$writer = New-Object System.IO.BinaryWriter($icoStream)

# Header: reserved(0), type(1), count(N)
$writer.Write([uint16]0)
$writer.Write([uint16]1)
$writer.Write([uint16]$pngDataList.Count)

$offset = 6 + ($pngDataList.Count * 16)

foreach ($item in $pngDataList) {
    $sz = $item.Size
    $wByte = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    $hByte = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    $len = $item.Bytes.Length

    $writer.Write($wByte)        # width
    $writer.Write($hByte)        # height
    $writer.Write([byte]0)       # colors
    $writer.Write([byte]0)       # reserved
    $writer.Write([uint16]1)     # planes
    $writer.Write([uint16]32)    # bpp
    $writer.Write([uint32]$len)   # size
    $writer.Write([uint32]$offset)# offset

    $offset += $len
}

foreach ($item in $pngDataList) {
    $writer.Write($item.Bytes)
}

$icoBytes = $icoStream.ToArray()
$writer.Dispose()
$icoStream.Dispose()

[System.IO.File]::WriteAllBytes("public/favicon.ico", $icoBytes)
[System.IO.File]::WriteAllBytes("electron/icon.ico", $icoBytes)

Write-Host "Icons successfully created and placed in public/ and electron/!"
