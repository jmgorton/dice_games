# --- Stage 1: Build Stage ---
FROM node:latest AS base

# WORKDIR /opt/app
WORKDIR /usr/src/app

# Copy package.json and install dependencies (including devDependencies like 'typescript')
COPY package*.json ./
RUN npm install
# COPY ./ /opt/app

# Copy all source files
COPY . .

# Run the TypeScript compiler (tsc) to transpile TS to JS
# The output (e.g., in a 'dist' or 'build' directory) will be in the build stage filesystem
RUN npm run build
# The 'build' script in your package.json should be configured to run 'tsc'
# e.g., "build": "tsc" or "build": "tsc --outDir dist"
# TODO verify on container: npx tsc *.ts --outDir dist

# --- Stage 2: Production/Run Stage ---
# Start a new, lean image for production
FROM node:20-alpine AS production
WORKDIR /usr/src/app
# FROM base AS staging

# RUN npx tsc *.ts
# Only install production dependencies
COPY package*.json ./
RUN npm install --production

# Copy only the *transpiled JavaScript files* from the 'build' stage (base)
# The 'dist' directory is commonly used as the output directory
COPY --from=base /usr/src/app/dist ./
COPY ./index.html ./

# VOLUME [ "/app" ]

# FROM staging AS ready

# Define the command to run the final JavaScript application
# CMD ["node", "./dist/app.js"]
CMD ["node", "app.js"] 
# CMD ["npx", "tsx", "app.js"]

# /opt/app/ ?? 
# or just app.js if you set WORKDIR to /opt/app