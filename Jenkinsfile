pipeline {
  agent any

  tools {
    nodejs 'node20'
  }

  environment {
    GITHUB_CREDENTIALS = 'github-pat'
    GITHUB_USER = 'busra-ertekin'
    BUILD_REPO = 'jenkins-builds'
    REPO_NAME = 'jenkins-demo-project'
  }

  stages {

    stage('Checkout') {
      steps {
        checkout([
          $class: 'GitSCM',
          branches: [[name: '*/main']],
          userRemoteConfigs: [[
            url: "https://github.com/${env.GITHUB_USER}/${env.REPO_NAME}.git",
            credentialsId: env.GITHUB_CREDENTIALS
          ]]
        ])
      }
    }

    stage('Prevent CI Loop') {
      steps {
        script {
          def lastAuthorEmail = sh(script: "git log -1 --pretty='%ae'", returnStdout: true).trim()

          if (lastAuthorEmail.contains("jenkins@")) {
            echo "🚫 Jenkins internal commit — skipping build"
            currentBuild.result = 'SUCCESS'
            error("Skipping to prevent CI loop")
          }

          echo "✅ Human commit detected, continuing pipeline"
        }
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

    stage('Bump version') {
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

            npm version patch -m "ci: bump version to %s" --force
            git push origin HEAD:main --follow-tags --force
          '''
        }
      }
    }

    stage('Build App') {
      steps {
        sh '''
          npm run build
        '''
      }
    }

    stage('Push Build') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: env.GITHUB_CREDENTIALS,
          usernameVariable: 'GIT_USER',
          passwordVariable: 'GIT_TOKEN'
        )]) {
          sh '''
            set -e
            VERSION=$(node -p "require('./package.json').version")
            DATE=$(date +"%Y-%m-%d_%H-%M-%S")

            FOLDER="jenkins-demo-project-v${VERSION}-${DATE}"
            TAR="${FOLDER}.tar.gz"

            mkdir $FOLDER
            rsync -av --exclude=node_modules --exclude=.git . $FOLDER/
            tar -czf $TAR $FOLDER

            TMP=$(mktemp -d)
            git clone https://${GIT_TOKEN}@github.com/${GITHUB_USER}/${BUILD_REPO}.git $TMP
            mv $FOLDER $TAR $TMP/

            cd $TMP
            git config user.email "jenkins@busra-ertekin.com"
            git config user.name "jenkins-ci"
            git add .
            git commit -m "build: ${VERSION}"
            git push origin main
          '''
        }
      }
    }
  }

  post {
    success { echo '✅ SUCCESS' }
    failure { echo '❌ FAILED' }
    always { cleanWs() }
  }
}
