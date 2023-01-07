chcp 65001
@echo off
set source=".\BBCodeExtension.vsix"
set onedrive="C:\Users\bazsi\OneDrive\Download Content"
set googledrive="C:\Users\bazsi\Saját meghajtó\Download Content"
echo Copy to OneDrive ...
copy %source% %onedrive%
echo Copy to Google Drive ...
copy %source% %googledrive%
echo Done
