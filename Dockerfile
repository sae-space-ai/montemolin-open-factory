FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
ENV HOST=0.0.0.0 PORT=5679 FACTORY_DATA=/app/data/factory.json
EXPOSE 5679
CMD ["npm","start"]
