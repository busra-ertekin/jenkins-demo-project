pipeline {
  agent any
  
  tools { nodejs 'node20' }
  
  // Poll SCM: Her 5 dakikada bir kontrol et ama [ci skip] varsa ignore et
  triggers {
    pollSCM('H/5 * * * *')  // Her 5 dakikada bir kontrol
  }
  
  environment {
    GITHUB_CREDENTIALS = 'github-pat'
    GITHUB_USER = 'busra-ertekin'
    BUILD_REPO = "jenkins-builds"
    REPO_NAME = "jenkins-demo-project"
    SHOULD_BUILD = "true"
  }
  
  stages {
    stage('Check Commit Message') {
      steps {
        script {
          // Son commit mesajını al
          def commitMsg = sh(
            script: 'git log -1 --pretty=%B',
            returnStdout: true
          ).trim()
          
          echo "Last commit message: ${commitMsg}"
          
          // [ci skip] veya [skip ci] varsa build'i atla
          if (commitMsg =~ /\[(ci skip|skip ci)\]/) {
            env.SHOULD_BUILD = "false"
            echo "⏭️  CI SKIP detected - Aborting build"
            echo "Commit message contains [ci skip] or [skip ci]"
            currentBuild.result = 'NOT_BUILT'
            error("Build skipped due to [ci skip] in commit message")
          }
          
          echo "✅ No [ci skip] found - Proceeding with build"
        }
      }
    }
    
    stage('Checkout') {
      steps {
        checkout([$class: 'GitSCM',
          branches: [[name: '*/main']],
          userRemoteConfigs: [[
            url: "https://github.com/${env.GITHUB_USER}/${env.REPO_NAME}.git",
            credentialsId: env.GITHUB_CREDENTIALS
          ]]
        ])
      }
    }
    
    stage('Install dependencies') {
      steps {
        sh '''
          echo "Current directory: $(pwd)"
          node -v
          npm ci
        '''
      }
    }
    
    stage('Bump version & tag') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: env.GITHUB_CREDENTIALS,
          usernameVariable: 'GIT_USER',
          passwordVariable: 'GIT_TOKEN'
        )]) {
          sh '''
            set -e
            
            echo "Configuring git..."
            git config user.email "jenkins@busra-ertekin.com"
            git config user.name "jenkins-ci"
            
            # Remote URL'i token ile ayarla
            git remote set-url origin https://${GIT_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git
            
            # Fetch all tags
            git fetch --tags
            
            # Mevcut version
            CURRENT_VERSION=$(node -p "require('./package.json').version")
            echo "Current version: ${CURRENT_VERSION}"
            
            # Yeni version hesapla
            IFS='.' read -r -a VERSION_PARTS <<< "$CURRENT_VERSION"
            MAJOR="${VERSION_PARTS[0]}"
            MINOR="${VERSION_PARTS[1]}"
            PATCH="${VERSION_PARTS[2]}"
            NEW_PATCH=$((PATCH + 1))
            NEW_VERSION="${MAJOR}.${MINOR}.${NEW_PATCH}"
            
            echo "New version will be: ${NEW_VERSION}"
            
            # Tag zaten var mı kontrol et
            if git rev-parse "v${NEW_VERSION}" >/dev/null 2>&1; then
              echo "⚠️  Tag v${NEW_VERSION} already exists, deleting it..."
              git tag -d "v${NEW_VERSION}" || true
              git push origin ":refs/tags/v${NEW_VERSION}" || true
              sleep 2
            fi
            
            # package.json'u güncelle
            npm version ${NEW_VERSION} --no-git-tag-version --allow-same-version
            
            # Değişiklikleri commit et
            git add package.json package-lock.json
            git commit -m "ci: bump version to ${NEW_VERSION} [ci skip]" || echo "No changes to commit"
            
            # Tag oluştur
            git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION}"
            
            # Push version and tags
            git push origin HEAD:main --follow-tags --force
            
            echo "✅ Version bumped to ${NEW_VERSION}"
          '''
        }
      }
    }
    
    stage('Build Application') {
      steps {
        sh '''
          echo "Building Next.js application..."
          npm run build
          
          # next export artık kullanılmıyor, out/ klasörü zaten oluşuyor
          if [ ! -d "out" ]; then
            echo "⚠️  out/ folder not found, checking .next/ ..."
            if [ -d ".next" ]; then
              echo "✅ Build completed in .next/"
            else
              echo "❌ Build folder not found!"
              exit 1
            fi
          else
            echo "✅ Build completed in out/"
          fi
        '''
      }
    }
    
    stage('Create and Push Build to Repository') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: env.GITHUB_CREDENTIALS,
          usernameVariable: 'GIT_USER',
          passwordVariable: 'GIT_TOKEN'
        )]) {
          sh '''
            set -e
            
            # Build bilgilerini al
            BUILD_DATE=$(date +"%Y-%m-%d_%H-%M-%S")
            COMMIT_SHA=$(git rev-parse --short HEAD)
            VERSION=$(node -p "require('./package.json').version")
            
            # Build klasör adı
            BUILD_FOLDER="jenkins-demo-project-v${VERSION}-${BUILD_DATE}"
            
            echo "================================================"
            echo "Creating build folder: ${BUILD_FOLDER}"
            echo "Version: v${VERSION}"
            echo "Date: ${BUILD_DATE}"
            echo "Commit: ${COMMIT_SHA}"
            echo "================================================"
            
            # Build klasörünü oluştur
            mkdir -p ${BUILD_FOLDER}
            
            # Tüm projeyi kopyala (node_modules ve .git hariç)
            rsync -av \
              --exclude='node_modules' \
              --exclude='.git' \
              --exclude='.next/cache' \
              --exclude="${BUILD_FOLDER}" \
              . ${BUILD_FOLDER}/
            
            # jenkins-builds reposunu klonla
            TMPDIR=$(mktemp -d)
            echo "Cloning jenkins-builds repository..."
            git clone https://${GIT_TOKEN}@github.com/${GITHUB_USER}/${BUILD_REPO}.git $TMPDIR
            
            # Build klasörünü taşı
            mv ${BUILD_FOLDER} $TMPDIR/
            
            # Commit ve push
            cd $TMPDIR
            
            git config user.email "jenkins@busra-ertekin.com"
            git config user.name "jenkins-ci"
            
            git add ${BUILD_FOLDER}
            
            COMMIT_MSG="Build: v${VERSION} (${BUILD_DATE})

Project: ${REPO_NAME}
Version: v${VERSION}
Build Date: ${BUILD_DATE}
Commit: ${COMMIT_SHA}
Build Number: #${BUILD_NUMBER}

Contents:
- Full source code
- Build output (.next/ or out/)
- All configuration files
- package.json & package-lock.json

Note: Run 'npm ci' to install dependencies"
            
            git commit -m "${COMMIT_MSG}"
            
            echo "Pushing to GitHub..."
            git push origin HEAD:main
            
            # Temizlik
            cd -
            rm -rf $TMPDIR
            
            echo "================================================"
            echo "✅ SUCCESS! Build pushed to GitHub"
            echo "Repository: https://github.com/${GITHUB_USER}/${BUILD_REPO}"
            echo "Folder: ${BUILD_FOLDER}"
            echo "================================================"
          '''
        }
      }
    }
    
    stage('Build Summary') {
      steps {
        sh '''
          BUILD_DATE=$(date +"%Y-%m-%d %H:%M:%S")
          COMMIT_SHA=$(git rev-parse --short HEAD)
          VERSION=$(node -p "require('./package.json').version")
          
          echo "========================================"
          echo "BUILD COMPLETED"
          echo "========================================"
          echo ""
          echo "📦 Project:      ${REPO_NAME}"
          echo "🏷️  Version:      v${VERSION}"
          echo "📅 Build Date:   ${BUILD_DATE}"
          echo "🔖 Commit:       ${COMMIT_SHA}"
          echo "🔢 Build:        #${BUILD_NUMBER}"
          echo ""
          echo "📍 Source:  https://github.com/${GITHUB_USER}/${REPO_NAME}"
          echo "📍 Builds:  https://github.com/${GITHUB_USER}/${BUILD_REPO}"
          echo ""
        '''
      }
    }
  }
  
  post {
    success {
      echo '========================================'
      echo '✅ BUILD SUCCESS'
      echo '========================================'
    }
    failure {
      echo '========================================'
      echo '❌ BUILD FAILED'
      echo '========================================'
    }
    aborted {
      echo '========================================'
      echo '⏭️  BUILD SKIPPED ([ci skip] found)'
      echo '========================================'
    }
    always {
      cleanWs()
    }
  }
}