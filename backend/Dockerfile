FROM openjdk:22-jdk-slim

WORKDIR /app

# Copy gradle files
COPY build.gradle settings.gradle gradlew ./
COPY gradle gradle

# Copy source code
COPY src src

# Make gradlew executable and build the application
RUN chmod +x ./gradlew

# Use bootJar specifically and check the result
RUN ./gradlew clean bootJar && \
    echo "Build completed, checking contents:" && \
    ls -la build/libs/ && \
    mv build/libs/*-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]