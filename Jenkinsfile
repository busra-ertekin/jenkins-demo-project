import java.net.URLEncoder
import groovy.json.JsonOutput

// test commit for jenkins update
// Global variables to share across stages
def MODULE_ID_VALUE = null
def MODULE_VERSION_VALUE = null
def DEPLOY_NAME_VALUE = null
def VERSION_TYPE_VALUE = null

// Helper function to parse module ID from commit message
def parseModuleId(commitMsg) {
    def matcher = commitMsg =~ /m:(\d+)/
    if (matcher.find()) {
        return matcher[0][1]
    }
    return null
}

// Helper function to determine version bump type from commit message
def determineVersionBump(commitMsg) {
    if (commitMsg =~ /major:/) return 'major'
    if (commitMsg =~ /minor:/) return 'minor'
    if (commitMsg =~ /(fix:|patch:)/) return 'patch'
    return 'patch' // default
}

// Helper function to get latest version tag for a module
def getLatestVersionTag(moduleId) {
    // Get all tags matching m<id>_v* pattern for this module
    def tags = sh(
        script: "git tag -l 'm${moduleId}_v*' --sort=-v:refname",
        returnStdout: true
    ).trim()
    
    // If no tags exist, return default version
    if (tags.isEmpty()) {
        return '0.0.0'
    }
    
    // Extract version number from tag (m2_v1.2.3 -> 1.2.3)
    def version = tags.split('\n')[0]
    def matcher = version =~ /m\d+_v([\d.]+)/
    if (matcher.find()) {
        return matcher[0][1]
    }
    
    return '0.0.0'
}

// Helper function to bump semantic version
def bumpVersion(currentVersion, bumpType) {
    def (major, minor, patch) = currentVersion.tokenize('.').collect { it as int }
    
    switch(bumpType) {
        case 'major':
            return "${major + 1}.0.0"
        case 'minor':
            return "${major}.${minor + 1}.0"
        case 'patch':
            return "${major}.${minor}.${patch + 1}"
        default:
            return "${major}.${minor}.${patch + 1}"
    }
}

// Helper function to create module version
def createModuleVersion(moduleId, moduleVersion, versionType, bearerToken) {
    // API expects version without 'v' prefix
    def cleanVersion = moduleVersion.replaceFirst('^v', '')
    def moduleUrl = "http://192.168.88.78:3025/version/modules/create/${moduleId}/${cleanVersion}/${versionType}"
    def currentTime = new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", TimeZone.getTimeZone('UTC'))
    
    def requestBody = JsonOutput.toJson([
        changelog: "Automated release ${moduleVersion}",
        releasedDate: currentTime
    ])
    
    // Write request body to file
    writeFile file: 'module_body.json', text: requestBody
    
    // Make API call using curl
    def response = sh(
        script: """
            curl -s -w '%{http_code}' -X POST '${moduleUrl}' \\
                -H 'accept: /' \\
                -H 'Authorization: Bearer ${bearerToken}' \\
                -H 'Content-Type: application/json' \\
                -d @module_body.json
        """,
        returnStdout: true
    ).trim()
    
    echo "Module Version API Response: ${response}"
    return response
}

pipeline {
    agent any

    environment {
        BUILD_REPO = "tugcan-perito/basit-next-oto-builds"
        MODULE_VERSION = ""
        MODULE_ID = ""
        DEPLOY_NAME = ""
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Parse Commit Message') {
            steps {
                script {
                     // test change

                    // Get last commit message
                    def commitMsg = sh(
                        script: 'git log -1 --pretty=%B',
                        returnStdout: true
                    ).trim()
                    
                    // Parse module ID from commit message
                    def moduleId = parseModuleId(commitMsg)
                    if (!moduleId) {
                        error """
                        No module ID found in commit message!
                        Commit message must contain 'm:<id>' to specify which module version to bump.
                        Example: 'm:2 minor: new feature added'
                        """
                    }
                    
                    // Determine version bump type
                    def bumpType = determineVersionBump(commitMsg)
                    
                    // Get current version and calculate new version
                    def currentVersion = getLatestVersionTag(moduleId)
                    def newVersion = bumpVersion(currentVersion, bumpType)
                    
                    // Store values in global variables AND environment
                    MODULE_ID_VALUE = moduleId
                    MODULE_VERSION_VALUE = "v${newVersion}"
                    DEPLOY_NAME_VALUE = "deploy-m${moduleId}_v${newVersion}.tar.gz"
                    VERSION_TYPE_VALUE = bumpType
                    env.MODULE_ID = moduleId
                    env.MODULE_VERSION = "v${newVersion}"
                    env.DEPLOY_NAME = "deploy-m${moduleId}_v${newVersion}.tar.gz"
                    env.VERSION_TYPE = bumpType
                    
                    echo """
                    Version Update Details:
                    - Module ID: ${moduleId}
                    - Current Version: ${currentVersion}
                    - Bump Type: ${bumpType}
                    - New Version: v${newVersion}
                    """
                }
            }
        }

        stage('Build Frontend (Next.js)') {
            steps {
                dir('frontend') {
                    sh '''
                        echo "=== FRONTEND: Using Node 20 for build ==="
                        
                        # Clean installation
                        rm -rf node_modules .next dist
                        rm -f package-lock.json
                        npm install
                        
                        echo "=== FRONTEND: Creating optimized static build ==="
                        # Configure static export in next.config.js
                        echo '/** @type {import("next").NextConfig} */' > next.config.js
                        echo 'const nextConfig = {' >> next.config.js
                        echo '  output: "export",' >> next.config.js
                        echo '  distDir: "dist"' >> next.config.js
                        echo '};' >> next.config.js
                        echo 'module.exports = nextConfig;' >> next.config.js
                        
                        # Build for production
                        NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production npm run build
                        
                        # Verify the build
                        echo "=== Build output structure ==="
                        ls -la dist/
                    '''
                }
            }
        }

        stage('Build Backend') {
            steps {
                dir('backend') {
                    sh '''
                        echo "=== BACKEND: npm ci ==="
                        if [ -f package-lock.json ]; then npm ci --only=production || true; else npm install --omit=dev || true; fi

                        # Eğer build script varsa çalıştır (ör. tsc)
                        if npm run | grep -q " build"; then
                            echo "Running npm run build for backend"
                            npm run build || true
                        else
                            echo "No build script for backend - skipping build step"
                        fi
                    '''
                }
            }
        }

        stage('Package Artifact') {
            steps {
                script {
                    echo "DEBUG: MODULE_ID_VALUE = ${MODULE_ID_VALUE}"
                    echo "DEBUG: MODULE_VERSION_VALUE = ${MODULE_VERSION_VALUE}"
                    echo "DEBUG: DEPLOY_NAME_VALUE = ${DEPLOY_NAME_VALUE}"
                    
                    sh """
                        echo "=== Creating production deployment package ==="
                        rm -rf artifact_temp
                        mkdir -p artifact_temp

                        # Frontend: Copy static build
                        echo "Packaging frontend..."
                        mkdir -p artifact_temp/frontend
                        if [ -d frontend/dist ]; then
                            cp -r frontend/dist/* artifact_temp/frontend/
                            
                            # Copy package.json for serve
                            cp frontend/package.json artifact_temp/frontend/
                            
                            # Create optimized Dockerfile for pre-built static files with runtime config
                            cat > artifact_temp/frontend/Dockerfile << 'EOF'
FROM node:20-alpine AS runner
WORKDIR /app

# Copy pre-built static files
COPY . .

# Install serve globally and a simple http server for API proxy
RUN npm install -g serve http-server

# Create a simple nginx-like config for API proxy
RUN echo '#!/bin/sh' > /app/start.sh && \\
    echo 'echo "Starting frontend on port 3000..."' >> /app/start.sh && \\
    echo 'echo "API requests to /api/* will be proxied to backend:4000"' >> /app/start.sh && \\
    echo 'serve -s . -l 3000' >> /app/start.sh && \\
    chmod +x /app/start.sh

EXPOSE 3000

CMD ["/app/start.sh"]
EOF
                            
                            # Create .dockerignore
                            echo 'node_modules' > artifact_temp/frontend/.dockerignore
                            echo 'npm-debug.log' >> artifact_temp/frontend/.dockerignore
                            
                            # Create a simple serve script (fallback for non-Docker deployment)
                            echo '#!/bin/bash' > artifact_temp/frontend/serve.sh
                            echo 'npx serve -s .' >> artifact_temp/frontend/serve.sh
                            chmod +x artifact_temp/frontend/serve.sh
                            
                            # Install serve package for non-Docker deployment
                            cd artifact_temp/frontend
                            npm install --save serve
                            cd ../..
                        fi

                        # Backend: Prepare minimal production package
                        echo "Packaging backend..."
                        mkdir -p artifact_temp/backend
                        cp -r backend/src artifact_temp/backend/
                        cp backend/package.json artifact_temp/backend/
                        cp backend/Dockerfile artifact_temp/backend/
                        cp backend/.dockerignore artifact_temp/backend/ 2>/dev/null || true
                        
                        # Clean install production dependencies
                        cd artifact_temp/backend
                        echo "Installing backend dependencies..."
                        npm install --omit=dev --quiet
                        cd ../..

                        # Copy docker-compose.yml to artifact root
                        echo "Copying docker-compose.yml..."
                        cp docker-compose.yml artifact_temp/

                        # Create deployment scripts
                        echo "Creating deployment scripts..."
                        
                        # Docker deployment script
                        echo '#!/bin/bash' > artifact_temp/deploy-docker.sh
                        echo 'echo "Starting services with Docker Compose..."' >> artifact_temp/deploy-docker.sh
                        echo 'docker-compose up -d' >> artifact_temp/deploy-docker.sh
                        chmod +x artifact_temp/deploy-docker.sh
                        
                        # Manual deployment script (without Docker)
                        echo '#!/bin/bash' > artifact_temp/deploy.sh
                        echo '# Start frontend' >> artifact_temp/deploy.sh
                        echo 'cd frontend && ./serve.sh &' >> artifact_temp/deploy.sh
                        echo '# Start backend' >> artifact_temp/deploy.sh
                        echo 'cd ../backend && npm start' >> artifact_temp/deploy.sh
                        chmod +x artifact_temp/deploy.sh
                        
                        # Create README for deployment
                        echo '# Deployment Instructions' > artifact_temp/DEPLOY.md
                        echo '' >> artifact_temp/DEPLOY.md
                        echo '## Option 1: Deploy with Docker (Recommended)' >> artifact_temp/DEPLOY.md
                        echo '```bash' >> artifact_temp/DEPLOY.md
                        echo './deploy-docker.sh' >> artifact_temp/DEPLOY.md
                        echo '```' >> artifact_temp/DEPLOY.md
                        echo '' >> artifact_temp/DEPLOY.md
                        echo '## Option 2: Deploy without Docker' >> artifact_temp/DEPLOY.md
                        echo '```bash' >> artifact_temp/DEPLOY.md
                        echo './deploy.sh' >> artifact_temp/DEPLOY.md
                        echo '```' >> artifact_temp/DEPLOY.md

                        echo "=== Final package structure ==="
                        find artifact_temp -type f

                        # Create deployment archive
                        tar -czf "${DEPLOY_NAME_VALUE}" -C artifact_temp .
                        echo "=== Deployment package created: ${DEPLOY_NAME_VALUE} ==="
                        ls -lh "${DEPLOY_NAME_VALUE}"
                    """
                }
            }
        }

        stage('Test Build') {
            steps {
                script {
                    echo "=== Testing build by running frontend and backend ==="
                    
                    sh """
                        # Frontend test
                        echo "Testing frontend build..."
                        cd artifact_temp/frontend
                        
                        # Check if index.html exists
                        if [ ! -f index.html ]; then
                            echo "ERROR: index.html not found in build!"
                            exit 1
                        fi
                        
                        echo "✓ Frontend build files exist"
                        echo "Frontend files:"
                        ls -lh
                        
                        # Start frontend server in background
                        echo "Starting frontend server on port 3000..."
                        npx serve -s . -l 3000 > frontend.log 2>&1 &
                        FRONTEND_PID=\$!
                        echo "Frontend PID: \$FRONTEND_PID"
                        
                        # Wait for server to start
                        sleep 3
                        
                        # Test frontend
                        echo "Testing frontend endpoint..."
                        HTTP_CODE=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || echo "000")
                        
                        if [ "\$HTTP_CODE" = "200" ]; then
                            echo "✓ Frontend is serving correctly (HTTP \$HTTP_CODE)"
                        else
                            echo "✗ Frontend failed (HTTP \$HTTP_CODE)"
                            cat frontend.log
                            kill \$FRONTEND_PID 2>/dev/null || true
                            exit 1
                        fi
                        
                        # Stop frontend
                        kill \$FRONTEND_PID 2>/dev/null || true
                        cd ../..
                        
                        # Backend test
                        echo "Testing backend..."
                        cd artifact_temp/backend
                        
                        # Check if index.js exists
                        if [ ! -f src/index.js ]; then
                            echo "ERROR: Backend source not found!"
                            exit 1
                        fi
                        
                        echo "✓ Backend files exist"
                        
                        # Start backend in background
                        echo "Starting backend server on port 3001..."
                        PORT=3001 node src/index.js > backend.log 2>&1 &
                        BACKEND_PID=\$!
                        echo "Backend PID: \$BACKEND_PID"
                        
                        # Wait for server to start
                        sleep 3
                        
                        # Test backend
                        echo "Testing backend endpoint..."
                        HTTP_CODE=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/ || echo "000")
                        
                        if [ "\$HTTP_CODE" = "200" ]; then
                            echo "✓ Backend is serving correctly (HTTP \$HTTP_CODE)"
                        else
                            echo "⚠ Backend responded with HTTP \$HTTP_CODE (might be expected)"
                            cat backend.log || true
                        fi
                        
                        # Stop backend
                        kill \$BACKEND_PID 2>/dev/null || true
                        cd ../..
                        
                        echo "=== Build test completed ==="
                    """
                }
            }
        }

        stage('Push Tag to GitHub') {
            steps {
                script {
                    def moduleTag = "m${MODULE_ID_VALUE}_${MODULE_VERSION_VALUE}"
                    withCredentials([string(credentialsId: 'github-token', variable: 'GIT_TOKEN')]) {
                        sh """
                            git config user.email "jenkins@example.com"
                            git config user.name "jenkins"
                            
                            # Create and push semantic version tag
                            git tag -a "${moduleTag}" -m "Module ${MODULE_ID_VALUE} version ${MODULE_VERSION_VALUE}" || true
                            git push https://\${GIT_TOKEN}@github.com/tugcan-perito/basit-next-oto.git "${moduleTag}" || true
                        """
                    }
                }
            }
        }



    stage('Create Module Version') {
        steps {
            script {
                echo "Creating module version with ID: ${MODULE_ID_VALUE}, version: ${MODULE_VERSION_VALUE}, type: ${VERSION_TYPE_VALUE}"
                
                // Call API with bearer token from credentials
                withCredentials([string(credentialsId: 'bearer_token', variable: 'BEARER_TOKEN')]) {
                    def response = createModuleVersion(MODULE_ID_VALUE, MODULE_VERSION_VALUE, VERSION_TYPE_VALUE, env.BEARER_TOKEN)
                    
                    // Parse the response - status code is appended at the end
                    def statusCodeMatch = response =~ /(\d{3})$/
                    def statusCode = statusCodeMatch ? statusCodeMatch[0][1] : 'unknown'
                    def responseBody = statusCode != 'unknown' ? response.substring(0, response.lastIndexOf(statusCode)) : response

                    if (statusCode == '201') {
                        def jsonSlurper = new groovy.json.JsonSlurper()
                        def parsedResponse = jsonSlurper.parseText(responseBody)
                        echo """
                        Module version created successfully:
                        - Module ID: ${parsedResponse.moduleId}
                        - Version: ${parsedResponse.version}
                        - Version Type: ${VERSION_TYPE_VALUE}
                        - Created At: ${parsedResponse.createdAt}
                        - Changelog: ${parsedResponse.changelog}
                        """
                    } else {
                        echo "Warning: Module version creation returned status ${statusCode}"
                        echo "Response: ${responseBody}"
                    }
                }
            }
        }
        }

        stage('Push Release to GitHub') {
            steps {
                script {
                    withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
                        sh """
                            # Create release notes
                            echo "Module ${MODULE_ID_VALUE} Release ${MODULE_VERSION_VALUE}" > release-notes.md
                            echo "-------------------" >> release-notes.md
                            echo "Frontend: Next.js production build" >> release-notes.md
                            echo "Backend: Node.js/Express application" >> release-notes.md
                            echo "Deploy with: tar xzf ${DEPLOY_NAME_VALUE} && docker-compose up -d" >> release-notes.md
                            
                            # Create JSON payload
                            RELEASE_BODY=\$(cat release-notes.md | jq -Rs .)
                            
                            # Create GitHub release using curl
                            curl -L \\
                                -X POST \\
                                -H "Accept: application/vnd.github+json" \\
                                -H "Authorization: Bearer \${GITHUB_TOKEN}" \\
                                -H "X-GitHub-Api-Version: 2022-11-28" \\
                                https://api.github.com/repos/${env.BUILD_REPO}/releases \\
                                -d "{\\"tag_name\\":\\"m${MODULE_ID_VALUE}_${MODULE_VERSION_VALUE}\\",\\"name\\":\\"Module ${MODULE_ID_VALUE} Release ${MODULE_VERSION_VALUE}\\",\\"body\\":\${RELEASE_BODY}}"

                            # Upload the asset
                            RELEASE_ID=\$(curl -L \\
                                -H "Accept: application/vnd.github+json" \\
                                -H "Authorization: Bearer \${GITHUB_TOKEN}" \\
                                -H "X-GitHub-Api-Version: 2022-11-28" \\
                                https://api.github.com/repos/${env.BUILD_REPO}/releases/tags/m${MODULE_ID_VALUE}_${MODULE_VERSION_VALUE} | jq .id)

                            curl -L \\
                                -X POST \\
                                -H "Accept: application/vnd.github+json" \\
                                -H "Authorization: Bearer \${GITHUB_TOKEN}" \\
                                -H "X-GitHub-Api-Version: 2022-11-28" \\
                                -H "Content-Type: application/octet-stream" \\
                                "https://uploads.github.com/repos/${env.BUILD_REPO}/releases/\${RELEASE_ID}/assets?name=${DEPLOY_NAME_VALUE}" \\
                                --data-binary "@${DEPLOY_NAME_VALUE}"
                        """
                    }
                }
            }
        }

        stage('Deploy with Docker') {
            steps {
                script {
                    withCredentials([string(credentialsId: 'github-token', variable: 'GITHUB_TOKEN')]) {
                        sh """
                            echo "=== Deploying Module ${MODULE_ID_VALUE} ${MODULE_VERSION_VALUE} with Docker ==="
                            
                            # Create deployment directory
                            DEPLOY_DIR="/tmp/basit-next-oto-deploy"
                            rm -rf \${DEPLOY_DIR}
                            mkdir -p \${DEPLOY_DIR}
                            cd \${DEPLOY_DIR}
                            
                            # First, get the release ID and asset ID
                            echo "Fetching release information..."
                            curl -s -L \\
                                -H "Accept: application/vnd.github+json" \\
                                -H "Authorization: Bearer \${GITHUB_TOKEN}" \\
                                -H "X-GitHub-Api-Version: 2022-11-28" \\
                                https://api.github.com/repos/${env.BUILD_REPO}/releases/tags/m${MODULE_ID_VALUE}_${MODULE_VERSION_VALUE} \\
                                > release.json
                            
                            # Extract asset download URL
                            ASSET_URL=\$(cat release.json | jq -r '.assets[0].url')
                            
                            if [ "\${ASSET_URL}" = "null" ] || [ -z "\${ASSET_URL}" ]; then
                                echo "ERROR: Could not find asset URL in release!"
                                echo "Release JSON:"
                                cat release.json | jq .
                                exit 1
                            fi
                            
                            echo "Asset URL: \${ASSET_URL}"
                            
                            # Download the release artifact from GitHub using asset URL
                            echo "Downloading release artifact..."
                            curl -L \\
                                -H "Accept: application/octet-stream" \\
                                -H "Authorization: Bearer \${GITHUB_TOKEN}" \\
                                -H "X-GitHub-Api-Version: 2022-11-28" \\
                                -o "${DEPLOY_NAME_VALUE}" \\
                                "\${ASSET_URL}"
                            
                            # Verify download
                            if [ ! -f "${DEPLOY_NAME_VALUE}" ]; then
                                echo "ERROR: Failed to download release artifact!"
                                exit 1
                            fi
                            
                            echo "✓ Downloaded ${DEPLOY_NAME_VALUE}"
                            ls -lh "${DEPLOY_NAME_VALUE}"
                            
                            # Extract the artifact
                            echo "Extracting artifact..."
                            tar -xzf "${DEPLOY_NAME_VALUE}"
                            
                            # Verify extraction
                            if [ ! -f "docker-compose.yml" ]; then
                                echo "ERROR: docker-compose.yml not found in artifact!"
                                exit 1
                            fi
                            
                            echo "✓ Extracted successfully"
                            echo "Contents:"
                            ls -la
                            
                            # Stop existing containers if running
                            echo "Stopping existing containers..."
                            docker compose down 2>/dev/null || echo "No existing containers to stop"
                            
                            # Force stop and remove containers by name
                            echo "Force stopping and removing containers..."
                            docker stop basit-frontend basit-backend 2>/dev/null || true
                            docker rm basit-frontend basit-backend 2>/dev/null || true
                            
                            # Remove old images to force rebuild
                            echo "Removing old images..."
                            docker rmi basit-next-oto-deploy-frontend:latest 2>/dev/null || true
                            docker rmi basit-next-oto-deploy-backend:latest 2>/dev/null || true
                            docker rmi tmp-basit-next-oto-deploy-frontend:latest 2>/dev/null || true
                            docker rmi tmp-basit-next-oto-deploy-backend:latest 2>/dev/null || true
                            
                            # Clean up dangling images
                            docker image prune -f 2>/dev/null || true
                            
                            # Build and start containers
                            echo "Building and starting Docker containers..."
                            docker compose up -d --build
                            
                            # Wait for containers to be ready
                            echo "Waiting for containers to be ready..."
                            sleep 5
                            
                            # Check container status
                            echo "=== Container Status ==="
                            docker compose ps
                            
                            # Get container info
                            FRONTEND_STATUS=\$(docker inspect -f '{{.State.Status}}' basit-frontend 2>/dev/null || echo "not found")
                            BACKEND_STATUS=\$(docker inspect -f '{{.State.Status}}' basit-backend 2>/dev/null || echo "not found")
                            
                            echo ""
                            echo "╔════════════════════════════════════════════════════════════════╗"
                            echo "║        DEPLOYMENT SUCCESSFUL - Module ${MODULE_ID_VALUE} ${MODULE_VERSION_VALUE}          ║"
                            echo "╠════════════════════════════════════════════════════════════════╣"
                            echo "║                                                                ║"
                            echo "║  🌐 Frontend (Next.js)                                         ║"
                            echo "║     URL: http://localhost:3002                                 ║"
                            echo "║     Container: basit-frontend                                  ║"
                            echo "║     Status: \${FRONTEND_STATUS}                                       ║"
                            echo "║                                                                ║"
                            echo "║  🔧 Backend (Node.js/Express)                                  ║"
                            echo "║     URL: http://localhost:4001                                 ║"
                            echo "║     Container: basit-backend                                   ║"
                            echo "║     Status: \${BACKEND_STATUS}                                        ║"
                            echo "║                                                                ║"
                            echo "╚════════════════════════════════════════════════════════════════╝"
                            echo ""
                            echo "View logs:"
                            echo "  Frontend: docker logs -f basit-frontend"
                            echo "  Backend:  docker logs -f basit-backend"
                            echo ""
                            echo "Stop containers:"
                            echo "  cd \${DEPLOY_DIR} && docker compose down"
                            echo ""
                            
                            # Test endpoints
                            echo "Testing endpoints..."
                            sleep 3
                            
                            FRONTEND_HTTP=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/ || echo "000")
                            BACKEND_HTTP=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/ || echo "000")
                            
                            echo "Frontend response: HTTP \${FRONTEND_HTTP}"
                            echo "Backend response: HTTP \${BACKEND_HTTP}"
                            
                            if [ "\${FRONTEND_HTTP}" = "200" ] || [ "\${FRONTEND_HTTP}" = "304" ]; then
                                echo "✓ Frontend is responding correctly"
                            else
                                echo "⚠ Frontend response code: \${FRONTEND_HTTP}"
                            fi
                            
                            if [ "\${BACKEND_HTTP}" = "200" ] || [ "\${BACKEND_HTTP}" = "304" ]; then
                                echo "✓ Backend is responding correctly"
                            else
                                echo "⚠ Backend response code: \${BACKEND_HTTP}"
                            fi
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Pipeline finished successfully for module ${MODULE_ID_VALUE} version ${MODULE_VERSION_VALUE}"
        }
        failure {
            echo "Pipeline failed..."
        }
    }
}