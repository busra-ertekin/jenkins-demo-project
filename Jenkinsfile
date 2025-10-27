pipeline {
  agent any

  tools { nodejs 'node20' }   // ✅ Node ortamını tüm pipeline’a uygula

  environment {
    GITHUB_CREDENTIALS = 'github-pat'
    GITHUB_USER = 'busra-ertekin'
    BUILD_REPO = "https://github.com/${env.GITHUB_USER}/jenkins-builds.git"
    REPO_NAME = "jenkins-demo-project"
    PROJECT_PATH = "/Users/nazli/projeler/jenkins-demo-project"
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
        dir("${PROJECT_PATH}") {
          sh 'node -v'
          sh 'npm ci'
        }
      }
    }

    stage('Bump version & tag') {
      steps {
        dir("${PROJECT_PATH}") {
          sh '''
            git config user.email "jenkins@${GITHUB_USER}"
            git config user.name "jenkins-ci"
            npm version patch -m "ci: bump version to %s [ci skip]"
            git push origin --tags
            git push origin HEAD:main
          '''
        }
      }
    }

    stage('Docker build') {
      steps {
        dir("${PROJECT_PATH}") {
          sh '''
            IMAGE_TAG="${GITHUB_USER}/${REPO_NAME}:$(git rev-parse --short HEAD)"
            docker build -t $IMAGE_TAG .
          '''
        }
      }
    }

    stage('Build tar and push to jenkins-builds') {
      steps {
        dir("${PROJECT_PATH}") {
          withCredentials([usernamePassword(credentialsId: env.GITHUB_CREDENTIALS, usernameVariable: 'GIT_USER', passwordVariable: 'GIT_TOKEN')]) {
            sh '''
              sha=$(git rev-parse --short HEAD)
              artifact="artifact-${sha}.tar.gz"
              tar -czf ${artifact} .next package.json
              TMPDIR=$(mktemp -d)
              git clone https://${GIT_USER}:${GIT_TOKEN}@github.com/${GIT_USER}/jenkins-builds.git $TMPDIR
              cp ${artifact} $TMPDIR/
              cd $TMPDIR
              git config user.email "jenkins@${GIT_USER}"
              git config user.name "jenkins-ci"
              git add ${artifact}
              git commit -m "Add build artifact ${artifact}" || true
              git push origin HEAD:main
            '''
          }
        }
      }
    }
  }
}
