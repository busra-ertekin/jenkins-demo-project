pipeline {
    agent any
    
    environment {
        PROJECT_NAME = 'jenkins-demo-project'
        BUILD_REPO = 'git@github.com:busra-ertekin/jenkins-builds.git'
        MAIN_REPO = 'git@github.com:busra-ertekin/jenkins-demo-project.git'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    // Git bilgilerini al
                    env.GIT_COMMIT_SHORT = sh(
                        script: "git rev-parse --short HEAD",
                        returnStdout: true
                    ).trim()
                    
                    env.GIT_BRANCH = sh(
                        script: "git rev-parse --abbrev-ref HEAD",
                        returnStdout: true
                    ).trim()
                    
                    // Tarih ve saat
                    env.BUILD_DATE = sh(
                        script: "date +%Y%m%d-%H%M%S",
                        returnStdout: true
                    ).trim()
                    
                    // Versiyon oluştur: v1.0.BUILD_NUMBER-COMMIT_HASH
                    env.VERSION = "v1.0.${BUILD_NUMBER}-${GIT_COMMIT_SHORT}"
                    env.BUILD_VERSION = env.VERSION
                    
                    echo "=========================================="
                    echo "🚀 Build Başlıyor"
                    echo "=========================================="
                    echo "📦 Proje: ${PROJECT_NAME}"
                    echo "🏷️  Version: ${VERSION}"
                    echo "🔀 Branch: ${GIT_BRANCH}"
                    echo "📝 Commit: ${GIT_COMMIT_SHORT}"
                    echo "📅 Build Date: ${BUILD_DATE}"
                    echo "=========================================="
                }
            }
        }
        
        stage('Install Dependencies') {
            steps {
                echo "📥 Dependencies yükleniyor..."
                sh '''
                    node --version
                    npm --version
                    npm ci
                '''
                echo "✅ Dependencies yüklendi"
            }
        }
        
        stage('Build Project') {
            steps {
                echo "🔨 Next.js build yapılıyor..."
                sh '''
                    export BUILD_VERSION=${VERSION}
                    npm run build
                '''
                echo "✅ Build tamamlandı"
            }
        }
        
        stage('Create Tar Archive') {
            steps {
                echo "📦 Tar arşivi oluşturuluyor..."
                sh '''
                    # Build dosyalarını paketlemek için tar oluştur
                    tar -czf ${PROJECT_NAME}-${VERSION}.tar.gz \
                        .next \
                        public \
                        package.json \
                        package-lock.json \
                        next.config.js \
                        node_modules/.package-lock.json \
                        --exclude=node_modules
                    
                    # Dosya boyutunu göster
                    echo "📊 Arşiv Bilgisi:"
                    ls -lh ${PROJECT_NAME}-${VERSION}.tar.gz
                    
                    # İçeriği kontrol et
                    echo "📋 Arşiv İçeriği:"
                    tar -tzf ${PROJECT_NAME}-${VERSION}.tar.gz | head -20
                '''
                echo "✅ Tar arşivi oluşturuldu: ${PROJECT_NAME}-${VERSION}.tar.gz"
            }
        }
        
        stage('Create Git Tag') {
            steps {
                echo "🏷️  Git tag oluşturuluyor: ${VERSION}"
                withCredentials([sshUserPrivateKey(credentialsId: 'github-ssh', keyFileVariable: 'SSH_KEY')]) {
                    sh '''
                        # SSH yapılandırması
                        eval $(ssh-agent -s)
                        ssh-add $SSH_KEY
                        
                        # SSH host key'i ekle
                        mkdir -p ~/.ssh
                        ssh-keyscan github.com >> ~/.ssh/known_hosts
                        
                        # Git kullanıcı bilgilerini ayarla
                        git config user.email "jenkins@localhost"
                        git config user.name "Jenkins CI"
                        
                        # Tag oluştur
                        git tag -a ${VERSION} -m "Automated build ${VERSION} on ${BUILD_DATE}"
                        
                        # Tag'i push et
                        git push origin ${VERSION}
                        
                        echo "✅ Tag ${VERSION} oluşturuldu ve push edildi"
                    '''
                }
            }
        }
        
        stage('Push to Builds Repository') {
            steps {
                echo "📤 Build dosyası jenkins-builds repo'suna yükleniyor..."
                withCredentials([sshUserPrivateKey(credentialsId: 'github-ssh', keyFileVariable: 'SSH_KEY')]) {
                    sh '''
                        # SSH yapılandırması
                        eval $(ssh-agent -s)
                        ssh-add $SSH_KEY
                        
                        # Eski builds-repo klasörünü temizle
                        rm -rf builds-repo
                        
                        # Builds repo'sunu klonla
                        git clone ${BUILD_REPO} builds-repo
                        cd builds-repo
                        
                        # Git yapılandırması
                        git config user.email "jenkins@localhost"
                        git config user.name "Jenkins CI"
                        
                        # Tar dosyasını kopyala
                        cp ../${PROJECT_NAME}-${VERSION}.tar.gz .
                        
                        # README güncelle veya oluştur
                        cat > README.md << EOF
# Jenkins Demo Project - Builds

Bu repo otomatik build dosyalarını içerir.

## Son Build Bilgileri

- **Version:** ${VERSION}
- **Build Date:** ${BUILD_DATE}
- **Commit:** ${GIT_COMMIT_SHORT}
- **Branch:** ${GIT_BRANCH}
- **Build Number:** ${BUILD_NUMBER}

## Dosya Adı
\`${PROJECT_NAME}-${VERSION}.tar.gz\`

## Kurulum

\`\`\`bash
# Tar dosyasını indir
curl -LO https://github.com/busra-ertekin/jenkins-builds/raw/main/${PROJECT_NAME}-${VERSION}.tar.gz

# Çıkart
tar -xzf ${PROJECT_NAME}-${VERSION}.tar.gz

# Bağımlılıkları yükle
npm install

# Uygulamayı başlat
npm start
\`\`\`

## Tüm Build'ler

EOF
                        
                        # Tüm tar dosyalarını listele
                        echo "| Version | Dosya Boyutu | Tarih |" >> README.md
                        echo "|---------|-------------|-------|" >> README.md
                        ls -lh *.tar.gz 2>/dev/null | awk '{print "| " $9 " | " $5 " | " $6 " " $7 " " $8 " |"}' >> README.md || true
                        
                        # Git'e ekle
                        git add .
                        
                        # Commit
                        git commit -m "Add build ${VERSION} - Built on ${BUILD_DATE}

Build Details:
- Version: ${VERSION}
- Build Number: ${BUILD_NUMBER}
- Commit: ${GIT_COMMIT_SHORT}
- Branch: ${GIT_BRANCH}
- Date: ${BUILD_DATE}
"
                        
                        # Push
                        git push origin main
                        
                        cd ..
                        echo "✅ Build ${VERSION} jenkins-builds repo'suna yüklendi"
                    '''
                }
            }
        }
    }
    
    post {
        success {
            echo """
========================================
✅ BUILD BAŞARILI!
========================================
📦 Proje: ${PROJECT_NAME}
🏷️  Version: ${VERSION}
📅 Build Date: ${BUILD_DATE}
🔀 Branch: ${GIT_BRANCH}
📝 Commit: ${GIT_COMMIT_SHORT}
========================================
✅ Git tag oluşturuldu: ${VERSION}
✅ Tag ana repo'ya push edildi
✅ Tar arşivi oluşturuldu: ${PROJECT_NAME}-${VERSION}.tar.gz
✅ Build jenkins-builds repo'suna yüklendi
========================================
🔗 Ana Repo: https://github.com/busra-ertekin/jenkins-demo-project
🔗 Builds Repo: https://github.com/busra-ertekin/jenkins-builds
🔗 Tag Link: https://github.com/busra-ertekin/jenkins-demo-project/releases/tag/${VERSION}
========================================
"""
        }
        failure {
            echo """
========================================
❌ BUILD BAŞARISIZ!
========================================
📦 Proje: ${PROJECT_NAME}
🏷️  Version: ${VERSION}
📅 Build Date: ${BUILD_DATE}
========================================
Lütfen console output'u kontrol edin.
========================================
"""
        }
        always {
            // Temizlik
            sh '''
                rm -rf builds-repo
                echo "🧹 Geçici dosyalar temizlendi"
            '''
        }
    }
}
