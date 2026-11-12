
# DevOps Lab Website

A static website developed as part of a hands-on Linux and DevOps project.

## Technology stack

- HTML5
- CSS3
- JavaScript
- Git and GitHub
- Jenkins
- Ubuntu Linux
- SSH and SCP
- Nginx

## Project architecture

The project uses three virtual machines:

| Machine | IP address | Responsibility |
|---|---|---|
| Jenkins Controller | 192.168.31.139 | Pipeline orchestration |
| Jenkins Agent | 192.168.31.180 | Build, test and deployment |
| Application Server | 192.168.31.190 | Nginx hosting |

## Repository structure

```text
devops-lab-website/
├── Jenkinsfile
├── README.md
├── .gitignore
└── app/
    ├── index.html
    ├── style.css
    └── script.js
```

## Running locally

Open `app/index.html` in a web browser.

## CI/CD workflow

1. Developer pushes code to GitHub.
2. Jenkins detects changes using Poll SCM.
3. Jenkins checks out the repository.
4. Jenkins prepares the website artifact.
5. Jenkins validates the application files.
6. Jenkins backs up the existing deployment.
7. Jenkins deploys the new application to VM3.
8. Jenkins verifies the HTTP response.
9. Jenkins performs rollback if verification fails.

## Application URL

http://192.168.31.190:8081/

