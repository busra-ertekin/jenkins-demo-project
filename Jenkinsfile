pipeline {
    agent any

    environment {
        BUILD_REPO = "busra-ertekin/jenkins-builds"
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
                    def commitMsg = sh(script: 'git log -1 --pretty=%B', returnStdout: true).trim()
                    def moduleId = (commitMsg =~ /m:(\d+)/)[0][1]
                    def bumpType = commitMsg.contains("minor:") ? "minor" : commitMsg.contains("major:") ? "major" : "patch"

                    def tags = sh(script: "git tag -l 'm${moduleId}_v*' --sort=-v:refname", returnStdout: true).trim()
                    def currentVersion = tags ? (tags.split('\n')[0] =~ /m\d+_v([\d.]+)/)[0][1] : "0.0.0"

                    def (major, minor, patch) = currentVersion.tokenize('.').collect{it as int}
                    def newVersion = bumpType == "major" ? "${major+1}.0.0" :
                                     bumpType == "minor" ? "${major}.${minor+1}.0" :
                                     "${major}.${minor}.${patch+1}"

                    env.MODULE_ID = moduleId
                    env.MODULE_VERSION = "v${newVersion}"
                    env.DEPLOY_NAME = "deploy-m${moduleId}_v${newVersion}.tar.gz"
                }
            }
        }

        stage('Build Next.js') {
            steps {
                sh '''
                    rm -rf node_modules .next out
                    npm install
                    npm run build

                    echo "--- Build Output ---"
                    ls -la out
                '''
            }
        }

        stage('Package Artifact') {
            steps {
                sh '''
                    rm -rf artifact_temp
                    mkdir artifact_temp
                    cp -r out artifact_temp/
                    cp package.json artifact_temp/
                    tar -czf "$DEPLOY_NAME" -C artifact_temp .
                '''
            }
        }

        stage('Push Artifact to build repo') {
            steps {
                withCredentials([string(credentialsId: 'github-pat', variable: 'GIT_TOKEN')]) {
                    sh '''
                        git config --global user.email "jenkins@example.com"
                        git config --global user.name "jenkins"

                        rm -rf builds-repo
                        git clone https://$GIT_TOKEN@github.com/${BUILD_REPO}.git builds-repo
                        cp "$DEPLOY_NAME" builds-repo/
                        cd builds-repo
                        git add .
                        git commit -m "m$MODULE_ID build $MODULE_VERSION"
                        git push || true
                    '''
                }
            }
        }
    }

    post {
        success { echo "✅ SUCCESS: m${env.MODULE_ID} ${env.MODULE_VERSION}" }
        failure { echo "❌ FAILED PIPELINE" }
    }
}
