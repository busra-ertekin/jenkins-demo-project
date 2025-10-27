pipeline {
  agent any
  
  tools { nodejs 'node20' }
  
  triggers {
    pollSCM('H/2 * * * *')
  }
  
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
            # Git durumunu kontrol et
            echo "Git status before bump:"
            git status
            
            # Git yapılandırması
            git config user.email "jenkins@busra-ertekin.com"
            git config user.name "jenkins-ci"
            
            # Remote URL'i token ile ayarla
            git remote set-url origin https://${GIT_TOKEN}@github.com/${GITHUB_USER}/${REPO_NAME}.git
            
            # Version bump
            npm version patch -m "ci: bump version to %s [ci skip]"
            
            # Push
            git push origin HEAD:main --follow-tags
          '''
        }
      }
    }
    
    stage('Docker build') {
      steps {
        sh '''
          IMAGE_TAG="${GITHUB_USER}/${REPO_NAME}:$(git rev-parse --short HEAD)"
          echo "Building Docker image: $IMAGE_TAG"
          docker build -t $IMAGE_TAG .
        '''
      }
    }
    
    stage('Build tar and push to jenkins-builds') {
      steps {
        withCredentials([usernamePassword(
          credentialsId: env.GITHUB_CREDENTIALS,
          usernameVariable: 'GIT_USER',
          passwordVariable: 'GIT_TOKEN'
        )]) {
          sh '''
            # Değişkenler
            sha=$(git rev-parse --short HEAD)
            artifact="artifact-${sha}.tar.gz"
            
            echo "Creating artifact: $artifact"
            
            # Tar oluştur
            tar -czf ${artifact} .next package.json package-lock.json
            
            # Geçici dizin
            TMPDIR=$(mktemp -d)
            echo "Temp directory: $TMPDIR"
            
            # jenkins-builds reposunu klonla
            git clone https://${GIT_TOKEN}@github.com/${GITHUB_USER}/${BUILD_REPO}.git $TMPDIR
            
            # Artifact'ı kopyala
            cp ${artifact} $TMPDIR/
            
            # jenkins-builds'e push
            cd $TMPDIR
            git config user.email "jenkins@busra-ertekin.com"
            git config user.name "jenkins-ci"
            git add ${artifact}
            git commit -m "Add build artifact ${artifact} from ${REPO_NAME}" || echo "No changes to commit"
            git push origin HEAD:main
            
            # Temizlik
            cd -
            rm -rf $TMPDIR
            
            echo "Artifact pushed successfully!"
          '''
        }
      }
    }
  }
  
  post {
    always {
      cleanWs()
    }
    success {
      echo '✅ Pipeline completed successfully!'
    }
    failure {
      echo '❌ Pipeline failed!'
    }
  }
}