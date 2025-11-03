import java.net.URLEncoder
import groovy.json.JsonOutput

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
    def tags = sh(
        script: "git tag -l 'm${moduleId}_v*' --sort=-v:refname",
        returnStdout: true
    ).trim()

    if (tags.isEmpty()) {
        return '0.0.0'
    }

    def version = tags.split('\n')[0]
    def matcher = version =~ /m\d+_v([\d.]+)/
    if (matcher.find()) {
        return matcher[0][1]
    }

    return '0.0.0'
}

// Version bump
def bumpVersion(currentVersion, bumpType) {
    def (major, minor, patch) = currentVersion.tokenize('.').collect { it as int }
    switch(bumpType) {
        case 'major': return "${major + 1}.0.0"
        case 'minor': return "${major}.${minor + 1}.0"
        default: return "${major}.${minor}.${patch + 1}"
    }
}

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
                    def commitMsg = sh(
                        script: 'git log -1 --pretty=%B',
                        returnStdout: true
                    ).trim()

                    def moduleId = parseModuleId(commitMsg)
                    if (!moduleId) {
                        error """
                        NO MODULE ID FOUND!
                        Commit must contain 'm:<id>'
                        Example: m:1 fix: test build
                        """
                    }

                    def bumpType = determineVersionBump(commitMsg)
                    def currentVersion = getLatestVersionTag(moduleId)
                    def newVersion = bumpVersion(currentVersion, bumpType)

                    MODULE_ID_VALUE = moduleId
                    MODULE_VERSION_VALUE = "v${newVersion}"
                    DEPLOY_NAME_VALUE = "deploy-m${moduleId}_v${newVersion}.tar.gz"
                    VERSION_TYPE_VALUE = bumpType

                    env.MODULE_ID = moduleId
                    env.MODULE_VERSION = "v${newVersion}"
                    env.DEPLOY_NAME = "deploy-m${moduleId}_v${newVersion}.tar.gz"
                    env.VERSION_TYPE = bumpType

                    echo """
                    MODULE: ${moduleId}
                    CURRENT VERSION: ${currentVersion}
                    NEW VERSION: v${newVersion}
                    """
                }
            }
        }

        stage('Build Frontend (Next.js)') {
            steps {
                dir('frontend') {
                    sh '''
                        echo "=== Building Next.js App (App Router) ==="

                        rm -rf node_modules .next
                        npm install
                        npm run build

                        echo "=== Build output (.next) ==="
                        ls -la .next
                    '''
                }
            }
        }

        stage('Package Artifact') {
            steps {
                script {
                    sh """
                        echo "=== Packaging Artifact ==="

                        rm -rf artifact_temp
                        mkdir -p artifact_temp/frontend

                        cp -r frontend/.next artifact_temp/frontend/
                        cp frontend/package.json artifact_temp/frontend/

                        tar -czf "${DEPLOY_NAME_VALUE}" -C artifact_temp .
                        echo "Artifact: ${DEPLOY_NAME_VALUE}"
                    """
                }
            }
        }

        stage('Push Build to GitHub repo') {
            steps {
                script {
                    withCredentials([string(credentialsId: 'github-pat', variable: 'GIT_TOKEN')]) {
                        sh """
                            echo "Pushing artifact to GitHub Builds repo..."

                            git config --global user.email "jenkins@example.com"
                            git config --global user.name "jenkins"

                            rm -rf builds-repo
                            git clone https://${GIT_TOKEN}@github.com/${env.BUILD_REPO}.git builds-repo

                            cp "${DEPLOY_NAME_VALUE}" builds-repo/

                            cd builds-repo
                            git add .
                            git commit -m "m${MODULE_ID_VALUE} build ${MODULE_VERSION_VALUE}"
                            git push
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo "✅ BUILD & PUSH SUCCESS — Module ${MODULE_ID_VALUE} Version ${MODULE_VERSION_VALUE}"
        }
        failure {
            echo "❌ PIPELINE FAILED"
        }
    }
}
