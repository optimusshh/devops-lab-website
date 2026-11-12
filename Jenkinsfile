
pipeline {

    agent {
        label 'linux-agent'
    }

    // Prevent two deployments from modifying the same site simultaneously.
    options {
        disableConcurrentBuilds()
    }

    environment {
        APP_NAME    = 'devops-lab-website'

        TARGET_HOST = '192.168.31.190'
        TARGET_USER = 'deploy'

        LIVE_DIR    = '/opt/devops-lab/current'
        BACKUP_DIR  = '/opt/devops-lab-backups'

        DEPLOY_URL  = 'http://192.168.31.190:8081/'
    }

    stages {

        // =====================================
        // 1. CHECKOUT
        // =====================================

        stage('Checkout') {
            steps {
                echo 'Checking out application from GitHub'

                sh '''
                    set -eu

                    echo "Repository contents:"
                    ls -la

                    echo "Application source:"
                    ls -la app/

                    echo "Git commit:"
                    git rev-parse --short HEAD
                '''
            }
        }


        // =====================================
        // 2. BUILD
        // =====================================

        stage('Build') {
            steps {
                script {
                    env.ARCHIVE_FILE =
                        "${env.APP_NAME}-${env.BUILD_NUMBER}.tar.gz"
                }

                sh '''
                    set -eu

                    echo "Preparing application build..."

                    # Remove previous build output
                    rm -rf build "$ARCHIVE_FILE"

                    # Create a clean build directory
                    mkdir -p build

                    # Copy application source into build directory
                    cp -R app/. build/

                    # Create deployment archive outside build/
                    tar -czf "$ARCHIVE_FILE" -C build .

                    echo "Build completed"

                    echo "Build contents:"
                    find build -maxdepth 2 -type f -print

                    echo "Deployment archive:"
                    ls -lh "$ARCHIVE_FILE"
                '''
            }
        }


        // =====================================
        // 3. TEST
        // =====================================

        stage('Test') {
            steps {
                sh '''
                    set -eu

                    echo "Testing application..."

                    # Verify required files exist
                    test -s build/index.html
                    test -s build/style.css
                    test -s build/script.js

                    # Verify HTML references its assets
                    grep -q 'style.css' build/index.html
                    grep -q 'script.js' build/index.html

                    # Verify expected application content
                    grep -q 'DevOps Lab' build/index.html

                    # Verify archive exists and contains the website
                    test -s "$ARCHIVE_FILE"
                    tar -tzf "$ARCHIVE_FILE" | grep -q 'index.html'

                    echo "All application tests passed!"
                '''
            }
        }


        // =====================================
        // 4. BACKUP
        // =====================================

        stage('Backup') {
            steps {
                script {

                    env.HAD_PREVIOUS = 'false'
                    env.BACKUP_FILE = ''

                    env.PREVIOUS_DIR =
                        "${env.LIVE_DIR}.previous-${env.BUILD_NUMBER}"

                    echo 'Checking existing application on VM3'

                    // Check whether an existing application exists
                    int appExists = sh(
                        script: '''
                            ssh -i /home/jenkins-agent/.ssh/id_ed25519 \
                                -o BatchMode=yes \
                                "${TARGET_USER}@${TARGET_HOST}" \
                                "test -f '${LIVE_DIR}/index.html'"
                        ''',
                        returnStatus: true
                    )

                    if (appExists == 0) {

                        env.HAD_PREVIOUS = 'true'

                        // Generate a unique timestamp
                        def timestamp = sh(
                            script: 'date +%Y%m%d-%H%M%S-%N',
                            returnStdout: true
                        ).trim()

                        // Unique backup archive for this build
                        env.BACKUP_FILE =
                            "${env.BACKUP_DIR}/${env.APP_NAME}-build-${env.BUILD_NUMBER}-${timestamp}.tar.gz"

                        // Archive the existing website on VM3
                        sh """
                            ssh -i /home/jenkins-agent/.ssh/id_ed25519 \
                                -o BatchMode=yes \
                                ${env.TARGET_USER}@${env.TARGET_HOST} \
                                "tar -czf '${env.BACKUP_FILE}' -C '${env.LIVE_DIR}' ."
                        """

                        echo "Backup created: ${env.BACKUP_FILE}"

                    } else if (appExists == 1) {

                        echo 'First deployment detected. No previous backup required.'

                    } else {

                        error('Unable to connect to VM3 or inspect the existing website.')

                    }
                }
            }
        }


        // =====================================
        // 5. DEPLOY
        // =====================================

        stage('Deploy') {
            steps {
                echo 'Deploying DevOps Lab website to VM3'

                sh '''
                    set -eu

                    REMOTE_ARCHIVE="/tmp/${APP_NAME}-${BUILD_NUMBER}.tar.gz"

                    STAGING_DIR="${LIVE_DIR}.staging-${BUILD_NUMBER}"

                    PREVIOUS_DIR="${LIVE_DIR}.previous-${BUILD_NUMBER}"

                    # Transfer the complete website archive
                    scp -i /home/jenkins-agent/.ssh/id_ed25519 \
                        -o BatchMode=yes \
                        "$ARCHIVE_FILE" \
                        "${TARGET_USER}@${TARGET_HOST}:${REMOTE_ARCHIVE}"

                    # Prepare and activate the new website on VM3
                    ssh -i /home/jenkins-agent/.ssh/id_ed25519 \
                        -o BatchMode=yes \
                        "${TARGET_USER}@${TARGET_HOST}" \
                        "set -eu

                        # Prepare a clean staging directory
                        rm -rf '$STAGING_DIR' '$PREVIOUS_DIR'

                        mkdir -p '$STAGING_DIR'

                        # Extract the website
                        tar -xzf '$REMOTE_ARCHIVE' -C '$STAGING_DIR'

                        # Ensure the main page exists
                        test -s '$STAGING_DIR/index.html'

                        # Preserve the currently deployed directory
                        if [ -d '$LIVE_DIR' ]; then
                            mv '$LIVE_DIR' '$PREVIOUS_DIR'
                        fi

                        # Activate the new website
                        if ! mv '$STAGING_DIR' '$LIVE_DIR'; then

                            # Restore previous directory if activation fails
                            if [ -d '$PREVIOUS_DIR' ]; then
                                mv '$PREVIOUS_DIR' '$LIVE_DIR'
                            fi

                            exit 1
                        fi

                        rm -f '$REMOTE_ARCHIVE'

                        echo 'Website deployed successfully'
                        "

                    echo "Deployment transfer completed"
                '''
            }
        }


        // =====================================
        // 6. VERIFY AND AUTOMATIC ROLLBACK
        // =====================================

        stage('Verify') {
            steps {
                script {

                    echo 'Verifying website over HTTP...'

                    // Check HTTP status and exact HTML content
                    int verifyStatus = sh(
                        script: '''
                            set -eu

                            RESPONSE_FILE=$(mktemp)

                            trap 'rm -f "$RESPONSE_FILE"' EXIT

                            # Request the home page
                            HTTP_CODE=$(curl -sS \
                                --connect-timeout 5 \
                                --max-time 20 \
                                -o "$RESPONSE_FILE" \
                                -w "%{http_code}" \
                                "$DEPLOY_URL")

                            echo "Homepage HTTP status: $HTTP_CODE"

                            test "$HTTP_CODE" = "200"

                            # Compare deployed HTML with build artifact
                            cmp -s build/index.html "$RESPONSE_FILE"

                            # Verify CSS is accessible
                            CSS_CODE=$(curl -sS \
                                -o /dev/null \
                                -w "%{http_code}" \
                                "${DEPLOY_URL}style.css")

                            echo "CSS HTTP status: $CSS_CODE"

                            test "$CSS_CODE" = "200"

                            # Verify JavaScript is accessible
                            JS_CODE=$(curl -sS \
                                -o /dev/null \
                                -w "%{http_code}" \
                                "${DEPLOY_URL}script.js")

                            echo "JavaScript HTTP status: $JS_CODE"

                            test "$JS_CODE" = "200"

                            echo "Website verification successful"
                        ''',
                        returnStatus: true
                    )


                    if (verifyStatus == 0) {

                        echo 'Deployment successful!'

                        // Remove temporary previous directory.
                        // The timestamped backup archive remains preserved.
                        sh '''
                            ssh -i /home/jenkins-agent/.ssh/id_ed25519 \
                                -o BatchMode=yes \
                                "${TARGET_USER}@${TARGET_HOST}" \
                                "rm -rf '${LIVE_DIR}.previous-${BUILD_NUMBER}'"
                        '''

                    } else {

                        echo 'Deployment verification FAILED!'
                        echo 'Starting automatic rollback...'


                        if (env.HAD_PREVIOUS == 'true') {

                            // Restore the previous directory
                            sh '''
                                set -eu

                                ssh -i /home/jenkins-agent/.ssh/id_ed25519 \
                                    -o BatchMode=yes \
                                    "${TARGET_USER}@${TARGET_HOST}" \
                                    "set -eu

                                    PREVIOUS_DIR='${PREVIOUS_DIR}'
                                    FAILED_DIR='${LIVE_DIR}.failed-${BUILD_NUMBER}'

                                    test -d '$PREVIOUS_DIR'

                                    rm -rf '$FAILED_DIR'

                                    # Preserve the failed release temporarily
                                    if [ -d '$LIVE_DIR' ]; then
                                        mv '$LIVE_DIR' '$FAILED_DIR'
                                    fi

                                    # Restore previous release
                                    if ! mv '$PREVIOUS_DIR' '$LIVE_DIR'; then

                                        # Recover failed release if restoration fails
                                        if [ -d '$FAILED_DIR' ]; then
                                            mv '$FAILED_DIR' '$LIVE_DIR'
                                        fi

                                        exit 1
                                    fi

                                    rm -rf '$FAILED_DIR'

                                    echo 'Previous release restored'
                                    "
                            '''

                            // Retrieve restored HTML for comparison
                            sh '''
                                scp -i /home/jenkins-agent/.ssh/id_ed25519 \
                                    -o BatchMode=yes \
                                    "${TARGET_USER}@${TARGET_HOST}:${LIVE_DIR}/index.html" \
                                    build/rollback-expected.html
                            '''

                            // Verify the restored website
                            int rollbackStatus = sh(
                                script: '''
                                    set -eu

                                    RESPONSE_FILE=$(mktemp)

                                    trap 'rm -f "$RESPONSE_FILE"' EXIT

                                    HTTP_CODE=$(curl -sS \
                                        --connect-timeout 5 \
                                        --max-time 20 \
                                        -o "$RESPONSE_FILE" \
                                        -w "%{http_code}" \
                                        "$DEPLOY_URL")

                                    echo "Rollback HTTP status: $HTTP_CODE"

                                    test "$HTTP_CODE" = "200"

                                    # Compare restored HTML
                                    cmp -s build/rollback-expected.html "$RESPONSE_FILE"

                                    # Check restored CSS and JavaScript
                                    test "$(curl -sS -o /dev/null -w "%{http_code}" "${DEPLOY_URL}style.css")" = "200"

                                    test "$(curl -sS -o /dev/null -w "%{http_code}" "${DEPLOY_URL}script.js")" = "200"

                                    echo "Previous website restored and verified successfully"
                                ''',
                                returnStatus: true
                            )


                            if (rollbackStatus != 0) {

                                error('Rollback restoration completed, but website verification failed. Investigate Nginx and network connectivity.')

                            } else {

                                error('New release rejected. Previous website restored successfully. Build marked FAILURE.')

                            }


                        } else {

                            // There was no previous release
                            sh '''
                                ssh -i /home/jenkins-agent/.ssh/id_ed25519 \
                                    -o BatchMode=yes \
                                    "${TARGET_USER}@${TARGET_HOST}" \
                                    "rm -rf '${LIVE_DIR}' '${PREVIOUS_DIR}'"
                            '''

                            error('First deployment failed. Failed application directory removed.')

                        }
                    }
                }
            }
        }

    }
}

