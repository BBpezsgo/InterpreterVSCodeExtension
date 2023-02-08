@echo off
echo TypeScript version:
call tsc --version
echo Compile TypeScript project ...
call tsc --project ./
echo Compile Done!
