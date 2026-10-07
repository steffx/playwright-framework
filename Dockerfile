# Runs the whole suite in the same image CI uses, so results (and screenshots) match.
#   docker build -t shoplite-tests .
#   docker run --rm -v "$PWD/playwright-report:/app/playwright-report" shoplite-tests
# Update visual baselines from inside the image:
#   docker run --rm -v "$PWD/tests:/app/tests" shoplite-tests npm run test:update-snapshots
FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

ENV CI=true
CMD ["npx", "playwright", "test"]
