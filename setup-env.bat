@echo off
echo Setting up environment variables for better OpenAI timeout handling...
echo.

echo Current OpenAI environment variables:
echo OPENAI_API_KEY: %OPENAI_API_KEY%
echo OPENAI_BASE_URL: %OPENAI_BASE_URL%
echo OPENAI_TIMEOUT: %OPENAI_TIMEOUT%
echo OPENAI_MODEL: %OPENAI_MODEL%
echo.

if "%OPENAI_TIMEOUT%"=="" (
    echo Setting OPENAI_TIMEOUT to 120000ms (2 minutes)
    set OPENAI_TIMEOUT=120000
    echo OPENAI_TIMEOUT set to %OPENAI_TIMEOUT%
) else (
    echo OPENAI_TIMEOUT is already set to %OPENAI_TIMEOUT%
)

if "%OPENAI_MODEL%"=="" (
    echo Setting OPENAI_MODEL to deepseek-r1-distill-llama-8b
    set OPENAI_MODEL=deepseek-r1-distill-llama-8b
    echo OPENAI_MODEL set to %OPENAI_MODEL%
) else (
    echo OPENAI_MODEL is already set to %OPENAI_MODEL%
)

echo.
echo Environment variables configured for this session!
echo To make these permanent, add them to your system environment variables.
echo.
echo You can now run:
echo   npm run check-openai
echo   npm start
echo.
