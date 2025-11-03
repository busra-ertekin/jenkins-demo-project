pipeline {
  agent any
  
  tools { nodejs 'node20' }
  
  environment {
    GITHUB_CREDENTIALS = 'github-pat'
    GITHUB_USER = 'busra-ertekin'
    BUILD_REPO = "jenkins-builds"
    REPO_NAME = "jenkins-demo-project"
  }
  
  stages {
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
            
            # Yeni version
            npm version patch -m "ci: bump version to %s [ci skip]" --force
            
            NEW_VERSION=$(node -p "require('./package.json').version")
            echo "New version: ${NEW_VERSION}"
            
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
          echo "✅ Build completed"
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
- Build output (.next/)
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
    always {
      cleanWs()
    }
  }
}