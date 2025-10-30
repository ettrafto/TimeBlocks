#!/bin/bash

echo "================================================"
echo "  TimeBlocks Backend Setup Script"
echo "================================================"
echo ""

# Check Java version
echo "✓ Checking Java installation..."
if ! command -v java &> /dev/null; then
    echo "❌ Java not found. Please install Java 21 or higher."
    exit 1
fi

JAVA_VERSION=$(java -version 2>&1 | awk -F '"' '/version/ {print $2}' | cut -d'.' -f1)
if [ "$JAVA_VERSION" -lt 21 ]; then
    echo "❌ Java 21+ required. Found Java $JAVA_VERSION"
    exit 1
fi
echo "   Java $JAVA_VERSION detected ✓"
echo ""

# Initialize Gradle wrapper if not exists
echo "✓ Checking Gradle wrapper..."
cd backend

if [ ! -f "gradle/wrapper/gradle-wrapper.jar" ]; then
    echo "   Gradle wrapper not initialized. Attempting to initialize..."
    if command -v gradle &> /dev/null; then
        gradle wrapper
        echo "   Gradle wrapper initialized ✓"
    else
        echo "❌ Gradle not found. Please install Gradle 8.5+ and run: gradle wrapper"
        echo "   Or download from: https://gradle.org/releases/"
        exit 1
    fi
else
    echo "   Gradle wrapper already initialized ✓"
fi
echo ""

# Make gradlew executable
chmod +x gradlew
echo "✓ Made gradlew executable"
echo ""

# Build the project
echo "✓ Building backend (this may take a minute on first run)..."
./gradlew build --no-daemon

if [ $? -eq 0 ]; then
    echo "   Build successful ✓"
    echo ""
    echo "================================================"
    echo "  Setup Complete!"
    echo "================================================"
    echo ""
    echo "To start the backend, run:"
    echo "  cd backend"
    echo "  ./gradlew bootRun --args='--spring.profiles.active=dev'"
    echo ""
    echo "The backend will be available at:"
    echo "  http://localhost:8080"
    echo ""
    echo "Test it with:"
    echo "  curl http://localhost:8080/api/health"
    echo ""
else
    echo "❌ Build failed. Please check the error messages above."
    exit 1
fi

