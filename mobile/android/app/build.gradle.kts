import java.util.Properties

plugins {
    id("com.android.application")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

// リリースの署名(Play に上げるアップロード鍵)。鍵と合言葉は android/key.properties に書き、リポジトリには入れない(docs/android-release.md)
val keyProps = Properties().apply {
    val f = rootProject.file("key.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

android {
    namespace = "com.tsudoro.tsudoro"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    defaultConfig {
        // ストアに出したあとは変えられない(docs/flutter-plan.md の「決めること」)
        applicationId = "com.tsudoro.tsudoro"
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        // 版の番号は pubspec.yaml の version(1.0.0+1 の +1 が versionCode。上げるたびに増やす)
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (keyProps.isNotEmpty()) {
            create("upload") {
                storeFile = file(keyProps.getProperty("storeFile"))
                storePassword = keyProps.getProperty("storePassword")
                keyAlias = keyProps.getProperty("keyAlias")
                keyPassword = keyProps.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            // 鍵がなければ開発用の鍵で署名する(手元で release を試すため)。開発用の鍵の AAB は Play が受け付けない
            signingConfig = signingConfigs.findByName("upload") ?: signingConfigs.getByName("debug")
        }
    }
}

kotlin {
    compilerOptions {
        jvmTarget = org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17
    }
}

flutter {
    source = "../.."
}
