FROM nginx:alpine
COPY index.html style.css pension.js app.js /usr/share/nginx/html/
EXPOSE 80
