FROM nginx:alpine
COPY index.html methodik.html style.css pension.js app.js \
     favicon.ico favicon.svg apple-touch-icon.png apple-touch-icon-precomposed.png \
     robots.txt sitemap.xml /usr/share/nginx/html/
# JSON-Zugriffslog-Konfiguration fuer Fluent Bit (siehe nginx.conf / compose.yaml).
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
