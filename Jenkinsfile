def context = [:]
def app_name = "gpx-nodejs"
def namespace = "production"

pipeline {
  agent any

  parameters {
    // build configs
    string(name: "branch", defaultValue: "master", description: "Branch to build")
  }

  stages {
    stage("Set contexts") {
      steps{
        script {
          context.image = "${env.GCR_IMAGE_PREFIX}${app_name}:${namespace}-${env.BUILD_NUMBER}"
        }
      }
    }
    stage("Building Image") {
      steps{
        script {
          context.dockerImage = docker.build("${context.image}",  '-f ./Dockerfile .')
        }
      }
    }
    stage("Testing Image") {
      steps{
        sh "docker run ${context.image} npm run test"
      }
    }
    stage("Push and Deploy") {
      steps {
        build job: 'push_and_deploy', parameters: [
          [$class: 'StringParameterValue', name: 'full_image', value: context.image],
          [$class: 'StringParameterValue', name: 'namespace', value: namespace],
          [$class: 'StringParameterValue', name: 'app_name', value: app_name],
          [$class: 'BooleanParameterValue', name: 'deploy', value: false],
        ]
      }
    }
  }
}
