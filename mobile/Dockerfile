FROM ubuntu:22.04 AS builder

ENV DEBIAN_FRONTEND=noninteractive
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV ANDROID_HOME=/opt/android-sdk

RUN apt-get update && apt-get install -y \
    openjdk-17-jdk \
    wget \
    unzip \
    curl \
    git \
    build-essential \
    ninja-build \
    python3 \
    python3-pip \
    file \
    && rm -rf /var/lib/apt/lists/*

# Find the actual JAVA_HOME path and create a symlink for consistency
RUN ACTUAL_JAVA_HOME=$(dirname $(dirname $(readlink -f $(which javac)))) && \
    echo "Found Java at: $ACTUAL_JAVA_HOME" && \
    ln -sf $ACTUAL_JAVA_HOME /usr/lib/jvm/java-17-openjdk

ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk
ENV ANDROID_NDK_HOME=${ANDROID_SDK_ROOT}/ndk/27.0.12077973
ENV ANDROID_NDK=${ANDROID_SDK_ROOT}/ndk/27.0.12077973
ENV PATH=${PATH}:${JAVA_HOME}/bin:${ANDROID_SDK_ROOT}/cmdline-tools/latest/bin:${ANDROID_SDK_ROOT}/platform-tools:${ANDROID_SDK_ROOT}/build-tools/35.0.0:${ANDROID_SDK_ROOT}/cmake/3.22.1/bin

RUN mkdir -p ${ANDROID_SDK_ROOT}/cmdline-tools && \
    cd /tmp && \
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip && \
    unzip commandlinetools-linux-*_latest.zip -d ${ANDROID_SDK_ROOT}/cmdline-tools && \
    mv ${ANDROID_SDK_ROOT}/cmdline-tools/cmdline-tools ${ANDROID_SDK_ROOT}/cmdline-tools/latest && \
    rm commandlinetools-linux-*_latest.zip

RUN yes | sdkmanager --licenses && \
    sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0" \
    "ndk;27.0.12077973" "cmake;3.22.1"

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get update && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

ARG EXPO_PUBLIC_API_URL
ARG EXPO_PUBLIC_GOOGLE_CLIENT_ID
ARG EXPO_PUBLIC_OAUTH_REDIRECT_URI

ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
ENV EXPO_PUBLIC_GOOGLE_CLIENT_ID=${EXPO_PUBLIC_GOOGLE_CLIENT_ID}
ENV EXPO_PUBLIC_OAUTH_REDIRECT_URI=${EXPO_PUBLIC_OAUTH_REDIRECT_URI}

RUN npx expo prebuild --platform android --clean

WORKDIR /app/android

# Configure Gradle properties for better build performance
RUN echo "org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m" >> gradle.properties && \
    echo "android.useAndroidX=true" >> gradle.properties && \
    echo "android.enableJetifier=true" >> gradle.properties

# Verify NDK and CMake are available
RUN ls -la ${ANDROID_SDK_ROOT}/ndk/27.0.12077973 && \
    ls -la ${ANDROID_SDK_ROOT}/cmake/3.22.1

RUN chmod +x ./gradlew && \
    ./gradlew assembleRelease --no-daemon --max-workers=2

FROM alpine:latest

ARG EXPO_PUBLIC_API_URL
ARG EXPO_PUBLIC_GOOGLE_CLIENT_ID
ARG EXPO_PUBLIC_OAUTH_REDIRECT_URI

ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
ENV EXPO_PUBLIC_GOOGLE_CLIENT_ID=${EXPO_PUBLIC_GOOGLE_CLIENT_ID}
ENV EXPO_PUBLIC_OAUTH_REDIRECT_URI=${EXPO_PUBLIC_OAUTH_REDIRECT_URI}

WORKDIR /output

COPY --from=builder /app/android/app/build/outputs/apk/release/app-release.apk ./client.apk

RUN ls -lh /output/client.apk

CMD ["sh", "-c", "echo 'Copying APK to shared volume...' && cp /output/client.apk /shared/client.apk && echo 'APK successfully copied to /shared/client.apk' && ls -lh /shared/client.apk && tail -f /dev/null"]



