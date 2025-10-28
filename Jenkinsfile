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
          echo "Installing dependencies..."
          node -v
          npm ci
        '''
      }
    }
    
    stage('Bump version in source repo') {
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
            
            git remote set-url origin https://${GIT_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git
            
            # Mevcut version
            CURRENT_VERSION=$(node -p "require('./package.json').version")
            echo "Current version: ${CURRENT_VERSION}"
            
            # Version bump (sadece package.json değişir)
            npm version patch -m "ci: bump version to %s [ci skip]" --force
            
            NEW_VERSION=$(node -p "require('./package.json').version")
            echo "New version: ${NEW_VERSION}"
            
            # Push to jenkins-demo-project (sadece package.json ve tag)
            git push origin HEAD:main --follow-tags --force
            
            echo "✅ Version bumped to ${NEW_VERSION} in source repo"
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
    
    stage('Push Build to jenkins-builds repo') {
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
            
            # Klasör ve tar isimleri
            BUILD_FOLDER="jenkins-demo-project-v${VERSION}-${BUILD_DATE}"
            TAR_FILE="${BUILD_FOLDER}.tar.gz"
            
            echo "================================================"
            echo "Creating build artifacts"
            echo "Version: v${VERSION}"
            echo "Date: ${BUILD_DATE}"
            echo "Commit: ${COMMIT_SHA}"
            echo "================================================"
            
            # 1. Build klasörünü oluştur
            mkdir -p ${BUILD_FOLDER}
            
            # Tüm projeyi kopyala (node_modules ve .git hariç)
            rsync -av \
              --exclude='node_modules' \
              --exclude='.git' \
              --exclude='.next/cache' \
              --exclude="${BUILD_FOLDER}" \
              --exclude='*.tar.gz' \
              . ${BUILD_FOLDER}/
            
            echo "Build folder created: ${BUILD_FOLDER}"
            
            # 2. Tar dosyası oluştur
            tar -czf ${TAR_FILE} ${BUILD_FOLDER}
            
            echo "Tar file created: ${TAR_FILE} ($(du -h ${TAR_FILE} | cut -f1))"
            
            # 3. jenkins-builds reposunu klonla
            TMPDIR=$(mktemp -d)
            echo "Cloning jenkins-builds repository..."
            git clone https://${GIT_TOKEN}@github.com/${GITHUB_USER}/${BUILD_REPO}.git $TMPDIR
            
            # 4. Build klasörünü ve tar'ı taşı
            mv ${BUILD_FOLDER} $TMPDIR/
            mv ${TAR_FILE} $TMPDIR/
            
            # 5. jenkins-builds reposuna commit ve push
            cd $TMPDIR
            
            git config user.email "jenkins@busra-ertekin.com"
            git config user.name "jenkins-ci"
            
            git add ${BUILD_FOLDER} ${TAR_FILE}
            
            COMMIT_MSG="Build v${VERSION} - ${BUILD_DATE}

Project: ${REPO_NAME}
Version: v${VERSION}
Build Date: ${BUILD_DATE}
Commit: ${COMMIT_SHA}
Build Number: #${BUILD_NUMBER}

Files added:
- ${BUILD_FOLDER}/ (full project with build)
- ${TAR_FILE} (compressed backup)

Usage:
  cd ${BUILD_FOLDER}
  npm ci
  npm run dev"
            
            git commit -m "${COMMIT_MSG}"
            
            echo "Pushing to jenkins-builds repository..."
            git push origin HEAD:main
            
            # Temizlik
            cd -
            rm -rf $TMPDIR
            
            echo "================================================"
            echo "✅ SUCCESS!"
            echo ""
            echo "Source repo (jenkins-demo-project):"
            echo "  - Version updated to v${VERSION}"
            echo "  - Git tag: v${VERSION}"
            echo ""
            echo "Build repo (jenkins-builds):"
            echo "  - Folder: ${BUILD_FOLDER}/"
            echo "  - Tar: ${TAR_FILE}"
            echo ""
            echo "Links:"
            echo "  Source: https://github.com/${GITHUB_USER}/${REPO_NAME}"
            echo "  Builds: https://github.com/${GITHUB_USER}/${BUILD_REPO}"
            echo "================================================"
          '''
        }
      }
    }
  }
  
  post {
    success {
      echo '✅ PIPELINE SUCCESS'
    }
    failure {
      echo '❌ PIPELINE FAILED'
    }
    always {
      cleanWs()
    }
  }
}
```

## 📂 SONUÇ YAPISI

### jenkins-demo-project reposu:
```
jenkins-demo-project/
├── src/
├── public/
├── package.json        (version: 0.1.35) ✅
├── Jenkinsfile
├── next.config.js
└── ...

NOT: .next/ klasörü YOK, build dosyaları YOK
```

### jenkins-builds reposu:
```
jenkins-builds/
├── jenkins-demo-project-v0.1.34-2025-10-27_16-30-45/
│   ├── src/
│   ├── .next/          ✅ BUILD BURADA
│   ├── package.json
│   └── ...
├── jenkins-demo-project-v0.1.34-2025-10-27_16-30-45.tar.gz  ✅ TAR BURADA
├── jenkins-demo-project-v0.1.35-2025-10-27_17-15-20/
├── jenkins-demo-project-v0.1.35-2025-10-27_17-15-20.tar.gz
└── README.md