FROM node:alpine

# CREATE APP directory
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app

# Copy dependencies
COPY package*.json .

# Global npm dependencies
ENV NPM_CONFIG_PREFIX=/home/node/.npm-global

# Install dependencies
RUN npm install
USER node

# Copy application files
COPY --chown=node:node . .

# Install custom plugin
COPY --chown=node:node ./custom-plugin /tmp/custom-plugin
#RUN cd /tmp/custom-plugin && npm pack
#RUN npm install /tmp/custom-plugin/custom-plugin-0.0.1.tgz
#RUN npm list --depth=0
#RUN rm -rf /tmp/custom-plugin

EXPOSE 8080
CMD ["node", "server.js"]

