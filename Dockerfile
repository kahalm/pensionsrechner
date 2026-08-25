FROM nginx:alpine
COPY index.html methodik.html style.css pension.js app.js /usr/share/nginx/html/
# JSON-Zugriffslog-Konfiguration fuer Fluent Bit (siehe nginx.conf / compose.yaml).
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
