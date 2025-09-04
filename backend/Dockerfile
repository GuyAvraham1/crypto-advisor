FROM openjdk:22-jdk-slim

WORKDIR /app

# Copy gradle files
COPY build.gradle settings.gradle gradlew ./
COPY gradle gradle

# Copy source code
COPY src src

# Make gradlew executable and build the application
RUN chmod +x ./gradlew
RUN ./gradlew clean build -x test

# Move the jar file to a predictable location
RUN mv build/libs/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]