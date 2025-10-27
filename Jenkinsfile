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
          node -v
          npm ci
        '''
      }
    }

    stage('Bump version & push updates') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: env.GITHUB_CREDENTIALS,
          usernameVariable: 'GIT_USER',
          passwordVariable: 'GIT_TOKEN'
        )]) {
          sh '''
            set -e
            git config user.email "jenkins@busra-ertekin.com"
            git config user.name "jenkins-ci"

            git remote set-url origin https://${GIT_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git
            git fetch --tags

            CURRENT_VERSION=$(node -p "require('./package.json').version")
            echo "Current version: ${CURRENT_VERSION}"

            npm version patch -m "ci: bump version to %s [ci skip]" --force
            NEW_VERSION=$(node -p "require('./package.json').version")

            git push origin HEAD:main --follow-tags
            echo "✅ Source updated and version bumped to ${NEW_VERSION}"
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

    stage('Package and Push Build Artifacts') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: env.GITHUB_CREDENTIALS,
          usernameVariable: 'GIT_USER',
          passwordVariable: 'GIT_TOKEN'
        )]) {
          sh '''
            set -e

            BUILD_DATE=$(date +"%Y-%m-%d_%H-%M-%S")
            VERSION=$(node -p "require('./package.json').version")
            COMMIT_SHA=$(git rev-parse --short HEAD)
            BUILD_FOLDER="build-v${VERSION}-${BUILD_DATE}"

            echo "Creating build folder: ${BUILD_FOLDER}"
            mkdir -p ${BUILD_FOLDER}

            # Sadece build output ve gerekli dosyaları kopyala
            cp -r .next ${BUILD_FOLDER}/
            cp package*.json ${BUILD_FOLDER}/
            cp -r public ${BUILD_FOLDER}/ || true

            # Tar oluştur
            TAR_FILE="${BUILD_FOLDER}.tar.gz"
            tar -czf ${TAR_FILE} ${BUILD_FOLDER}

            # Jenkins-builds reposuna gönder
            TMPDIR=$(mktemp -d)
            git clone https://${GIT_TOKEN}@github.com/${GITHUB_USER}/${BUILD_REPO}.git $TMPDIR

            cd $TMPDIR
            git config user.email "jenkins@busra-ertekin.com"
            git config user.name "jenkins-ci"

            mv ${WORKSPACE}/${BUILD_FOLDER} .
            mv ${WORKSPACE}/${TAR_FILE} .

            git add ${BUILD_FOLDER} ${TAR_FILE}
            git commit -m "Build: v${VERSION} (${BUILD_DATE}) [${COMMIT_SHA}]"
            git push origin HEAD:main

            echo "✅ Build folder and tar pushed to ${BUILD_REPO}"
          '''
        }
      }
    }

    stage('Build Summary') {
      steps {
        sh '''
          BUILD_DATE=$(date +"%Y-%m-%d %H:%M:%S")
          VERSION=$(node -p "require('./package.json').version")
          COMMIT_SHA=$(git rev-parse --short HEAD)

          echo "========================================"
          echo "📦 Project:  ${REPO_NAME}"
          echo "🏷️  Version:  v${VERSION}"
          echo "📅 Date:      ${BUILD_DATE}"
          echo "🔖 Commit:    ${COMMIT_SHA}"
          echo "📍 Builds:    https://github.com/${GITHUB_USER}/${BUILD_REPO}"
          echo "========================================"
        '''
      }
    }
  }

  post {
    success {
      echo '✅ BUILD SUCCESS'
    }
    failure {
      echo '❌ BUILD FAILED'
    }
    always {
      cleanWs()
    }
  }
}
