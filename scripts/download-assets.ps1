$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

New-Item -ItemType Directory -Force -Path "assets/images","assets/fonts/poppins","assets/fontawesome/css","assets/fontawesome/webfonts" | Out-Null

function Download-File([string]$Url, [string]$OutFile) {
    Write-Host "Downloading $Url -> $OutFile"
    Invoke-WebRequest -Uri $Url -OutFile $OutFile
}

# Site images
$imageMap = @{
    "assets/images/hero-bg.jpg"          = "https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg";
    "assets/images/page-header-bg.jpg"   = "https://images.pexels.com/photos/2161449/pexels-photo-2161449.jpeg";
    "assets/images/category-adventure.jpg" = "https://images.pexels.com/photos/2387793/pexels-photo-2387793.jpeg";
    "assets/images/category-city.jpg"    = "https://images.pexels.com/photos/169647/pexels-photo-169647.jpeg";
    "assets/images/category-culture.jpg" = "https://images.pexels.com/photos/161255/pexels-photo-161255.jpeg";
    "assets/images/why-us.jpg"           = "https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1";
    "assets/images/about-intro.jpg"      = "https://images.squarespace-cdn.com/content/v1/5cd57d59ca525b7e9eae595c/ae15d595-aaff-41eb-a6c4-c0154efaabca/sunset+at+Lake+Josephine+Glacier+NP+2024-06-30+004.jpg?format=1500w";
    "assets/images/dest-adventure.jpg"   = "https://images.pexels.com/photos/3889987/pexels-photo-3889987.jpeg";
    "assets/images/dest-city.jpg"        = "https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg";
    "assets/images/dest-culture.jpg"     = "https://images.pexels.com/photos/2356045/pexels-photo-2356045.jpeg";
}

foreach ($entry in $imageMap.GetEnumerator()) {
    Download-File -Url $entry.Value -OutFile $entry.Key
}

# Seed tour images
$seedUrls = @(
    "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
    "https://images.unsplash.com/photo-1547970810-dc1eac37d174?w=800&q=80",
    "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80",
    "https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=800&q=80",
    "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80",
    "https://images.unsplash.com/photo-1533587851505-d119e13fa0d7?w=800&q=80",
    "https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800&q=80",
    "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=800&q=80",
    "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800&q=80",
    "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80",
    "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80",
    "https://images.unsplash.com/photo-1476610182048-b716b8518aae?w=800&q=80"
)

for ($i = 0; $i -lt $seedUrls.Count; $i++) {
    $name = "assets/images/tour-{0:D2}.jpg" -f ($i + 1)
    Download-File -Url $seedUrls[$i] -OutFile $name
}

# Font Awesome local
Download-File -Url "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css" -OutFile "assets/fontawesome/css/all.min.css"

$faFonts = @(
    "fa-brands-400.woff2","fa-regular-400.woff2","fa-solid-900.woff2","fa-v4compatibility.woff2",
    "fa-brands-400.ttf","fa-regular-400.ttf","fa-solid-900.ttf","fa-v4compatibility.ttf"
)
foreach ($f in $faFonts) {
    Download-File -Url ("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/webfonts/" + $f) -OutFile ("assets/fontawesome/webfonts/" + $f)
}

# Poppins local
Download-File -Url "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" -OutFile "assets/fonts/poppins/poppins.css"

$fontCss = Get-Content "assets/fonts/poppins/poppins.css" -Raw
$woff2Urls = [regex]::Matches($fontCss, "https://fonts\.gstatic\.com[^)'\s]+\.woff2") | ForEach-Object { $_.Value } | Select-Object -Unique
foreach ($u in $woff2Urls) {
    $fileName = Split-Path $u -Leaf
    Download-File -Url $u -OutFile ("assets/fonts/poppins/" + $fileName)
    $fontCss = $fontCss.Replace($u, "./" + $fileName)
}
Set-Content -Path "assets/fonts/poppins/poppins.css" -Value $fontCss -Encoding UTF8

# Rewire files to local assets
$stylePath = "style.css"
$style = Get-Content $stylePath -Raw
$style = $style.Replace("https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap", "assets/fonts/poppins/poppins.css")
$style = $style.Replace("https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg", "assets/images/hero-bg.jpg")
$style = $style.Replace("https://images.pexels.com/photos/2161449/pexels-photo-2161449.jpeg", "assets/images/page-header-bg.jpg")
Set-Content -Path $stylePath -Value $style -Encoding UTF8

$index = Get-Content "index.html" -Raw
$index = $index.Replace("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css", "assets/fontawesome/css/all.min.css")
$index = $index.Replace("https://images.pexels.com/photos/2387793/pexels-photo-2387793.jpeg", "assets/images/category-adventure.jpg")
$index = $index.Replace("https://images.pexels.com/photos/169647/pexels-photo-169647.jpeg", "assets/images/category-city.jpg")
$index = $index.Replace("https://images.pexels.com/photos/161255/pexels-photo-161255.jpeg", "assets/images/category-culture.jpg")
$index = $index.Replace("https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1", "assets/images/why-us.jpg")
Set-Content "index.html" $index -Encoding UTF8

$about = Get-Content "about.html" -Raw
$about = $about.Replace("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css", "assets/fontawesome/css/all.min.css")
$about = $about.Replace("https://images.squarespace-cdn.com/content/v1/5cd57d59ca525b7e9eae595c/ae15d595-aaff-41eb-a6c4-c0154efaabca/sunset+at+Lake+Josephine+Glacier+NP+2024-06-30+004.jpg?format=1500w", "assets/images/about-intro.jpg")
$about = $about.Replace("https://images.pexels.com/photos/3889987/pexels-photo-3889987.jpeg", "assets/images/dest-adventure.jpg")
$about = $about.Replace("https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg", "assets/images/dest-city.jpg")
$about = $about.Replace("https://images.pexels.com/photos/2356045/pexels-photo-2356045.jpeg", "assets/images/dest-culture.jpg")
Set-Content "about.html" $about -Encoding UTF8

foreach ($p in @("tours.html","contact.html","profile.html","admin.html")) {
    $html = Get-Content $p -Raw
    $html = $html.Replace("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css", "assets/fontawesome/css/all.min.css")
    Set-Content $p $html -Encoding UTF8
}

$seedPath = "api/seed_tours.php"
$seed = Get-Content $seedPath -Raw
$seedOriginals = @(
    "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&q=80",
    "https://images.unsplash.com/photo-1547970810-dc1eac37d174?w=800&q=80",
    "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&q=80",
    "https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=800&q=80",
    "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80",
    "https://images.unsplash.com/photo-1533587851505-d119e13fa0d7?w=800&q=80",
    "https://images.unsplash.com/photo-1489749798305-4fea3ae63d43?w=800&q=80",
    "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=800&q=80",
    "https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?w=800&q=80",
    "https://images.unsplash.com/photo-1526392060635-9d6019884377?w=800&q=80",
    "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80",
    "https://images.unsplash.com/photo-1476610182048-b716b8518aae?w=800&q=80"
)
for ($i = 1; $i -le 12; $i++) {
    $seed = $seed.Replace($seedOriginals[$i - 1], ("assets/images/tour-{0:D2}.jpg" -f $i))
}
Set-Content $seedPath $seed -Encoding UTF8

Write-Host "Done. Local assets are downloaded and references updated."
