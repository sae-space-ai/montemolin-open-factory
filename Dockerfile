FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
USER node
ENV HOST=0.0.0.0 PORT=5679 FACTORY_DATA=/app/data/factory.json
EXPOSE 5679
CMD ["npm","start"]
