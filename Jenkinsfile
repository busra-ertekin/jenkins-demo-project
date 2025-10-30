pipeline {
  agent any

  tools { 
    nodejs 'node20' 
  }

  options {
    disableConcurrentBuilds()    // aynı anda birden fazla build kaçın
    timestamps()
  }

  environment {
    GITHUB_CREDENTIALS = 'github-pat'
    GITHUB_USER        = 'busra-ertekin'
    BUILD_REPO         = 'jenkins-builds'
    REPO_NAME          = 'jenkins-demo-project'
  }

  stages {

    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Skip if Tag Build (safety)') {
      steps {
        script {
          if (env.GIT_TAG_NAME || (env.GIT_REF && env.GIT_REF.startsWith('refs/tags/'))) {
            echo "🚫 Tag push kaynaklı build — skip!"
            currentBuild.result = 'SUCCESS'
            error("Tag build skipped")
          }
        }
      }
    }

    stage('Install dependencies') {
      steps {
        sh '''
          set -e
          echo "📦 Installing dependencies..."
          node -v
          npm ci
        '''
      }
    }

    stage('Bump version (tag only)') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: env.GITHUB_CREDENTIALS,
          usernameVariable: 'GIT_USER',
          passwordVariable: 'GIT_TOKEN'
        )]) {
          sh '''
            set -e

            git config user.email "jenkins@busra-ertekin.com"
            git config user.name  "jenkins-ci"

            CURRENT_VERSION=$(node -p "require('./package.json').version")
            echo "Current version: ${CURRENT_VERSION}"

            npm version patch --no-git-tag-version

            NEW_VERSION=$(node -p "require('./package.json').version")
            echo "New version: ${NEW_VERSION}"

            git tag "v${NEW_VERSION}"

            git remote set-url origin https://${GIT_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git
            git push origin --tags
          '''
        }
      }
    }

    stage('Build Application') {
      steps {
        sh '''
          set -e
          echo "🏗️ Building Next.js app..."
          npm run build
          echo "✅ Build complete"
        '''
      }
    }

    stage('Push Build Artifact to jenkins-builds repo') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: env.GITHUB_CREDENTIALS,
          usernameVariable: 'GIT_USER',
          passwordVariable: 'GIT_TOKEN'
        )]) {
          sh '''
            set -e

            BUILD_DATE=$(date +"%Y-%m-%d_%H-%M-%S")
            COMMIT_SHA=$(git rev-parse --short HEAD)
            VERSION=$(node -p "require('./package.json').version")

            BUILD_FOLDER="jenkins-demo-project-v${VERSION}-${BUILD_DATE}"
            TAR_FILE="${BUILD_FOLDER}.tar.gz"

            mkdir -p "${BUILD_FOLDER}"

            rsync -av \
              --exclude='node_modules' \
              --exclude='.git' \
              --exclude='.next/cache' \
              --exclude='*.tar.gz' \
              . "${BUILD_FOLDER}/"

            tar -czf "${TAR_FILE}" "${BUILD_FOLDER}"

            TMPDIR=$(mktemp -d)
            git clone https://${GIT_TOKEN}@github.com/${GITHUB_USER}/${BUILD_REPO}.git "$TMPDIR"

            mv "${BUILD_FOLDER}" "${TAR_FILE}" "$TMPDIR/"

            cd "$TMPDIR"
            git config user.email "jenkins@busra-ertekin.com"
            git config user.name  "jenkins-ci"
            git add "${BUILD_FOLDER}" "${TAR_FILE}"
            git commit -m "build: v${VERSION} - ${BUILD_DATE} (${COMMIT_SHA})"
            git push origin HEAD:main

            cd -
            rm -rf "$TMPDIR"
          '''
        }
      }
    }
  }

  post {
    success { echo '✅ PIPELINE SUCCESS' }
    failure { echo '❌ PIPELINE FAILED' }

    always {
      echo "🧹 Cleaning workspace & caches..."

      sh '''
        npm cache clean --force || true
        rm -rf .next || true
        rm -rf "$WORKSPACE@tmp" || true
        rm -rf "$WORKSPACE@2@tmp" || true
        rm -rf /var/folders/*/*/*/T/tmp.* 2>/dev/null || true
      '''

      cleanWs()
    }
  }
}
