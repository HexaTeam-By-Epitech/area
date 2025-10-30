FROM reactnativecommunity/react-native-android:latest AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

ARG EXPO_PUBLIC_API_URL
ARG EXPO_PUBLIC_GOOGLE_CLIENT_ID
ARG EXPO_PUBLIC_OAUTH_REDIRECT_URI

ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}
ENV EXPO_PUBLIC_GOOGLE_CLIENT_ID=${EXPO_PUBLIC_GOOGLE_CLIENT_ID}
ENV EXPO_PUBLIC_OAUTH_REDIRECT_URI=${EXPO_PUBLIC_OAUTH_REDIRECT_URI}

COPY app.json babel.config.js metro.config.js* index.js App.js styles.js config.js ./
COPY assets ./assets
COPY components ./components
COPY screens ./screens
COPY context ./context
COPY utils ./utils

RUN npx expo prebuild --platform android

WORKDIR /app/android

RUN echo "org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+UseParallelGC" >> gradle.properties && \
    echo "android.useAndroidX=true" >> gradle.properties && \
    echo "android.enableJetifier=true" >> gradle.properties && \
    echo "org.gradle.caching=true" >> gradle.properties && \
    echo "org.gradle.parallel=true" >> gradle.properties && \
    echo "org.gradle.configureondemand=true" >> gradle.properties && \
    echo "android.enableR8.fullMode=false" >> gradle.properties


RUN chmod +x ./gradlew && \
    ./gradlew assembleRelease --build-cache --parallel

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



