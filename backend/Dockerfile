FROM openjdk:22-jdk-slim

WORKDIR /app

# Copy gradle files
COPY build.gradle settings.gradle gradlew ./
COPY gradle gradle

# Copy source code
COPY src src

# Make gradlew executable and build the application
RUN chmod +x ./gradlew

# Build and check what was created
RUN ./gradlew clean build -x test && \
    echo "Build completed, checking contents:" && \
    ls -la build/libs/ && \
    find build/libs -name "*.jar" -exec mv {} app.jar \;

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]