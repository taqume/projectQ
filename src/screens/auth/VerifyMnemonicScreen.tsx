import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Button, StyleSheet, SafeAreaView, TouchableOpacity, Alert } from 'react-native';

// Navigasyon ve route tipleri
type VerifyMnemonicScreenProps = {
  navigation: any; // StackNavigationProp<AuthStackParamList, 'VerifyMnemonic'>
  route: any; // RouteProp<AuthStackParamList, 'VerifyMnemonic'>
};

// Yardımcı fonksiyon: Diziyi karıştırmak için (Fisher-Yates shuffle)
const shuffleArray = <T extends any>(array: T[]): T[] => {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
};

// Yanıltıcı kelimeler (isteğe bağlı, daha fazla eklenebilir)
const decoyWords = ['apple', 'banana', 'car', 'dog', 'house', 'tree', 'river', 'mountain', 'book', 'phone'];

const VerifyMnemonicScreen: React.FC<VerifyMnemonicScreenProps> = ({ navigation, route }) => {
  const { mnemonic } = route.params; // Önceki ekrandan gelen mnemonic
  const originalWords = useMemo(() => mnemonic.split(' '), [mnemonic]);

  const [wordPool, setWordPool] = useState<string[]>([]);
  const [selectionOrder, setSelectionOrder] = useState<number[]>([]); // Hangi sıradaki kelimelerin seçileceği
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const currentOriginalWords = mnemonic.split(' ');
    // Kelime havuzunu oluştur: orijinal kelimeler + yanıltıcı kelimeler, sonra karıştır
    const combinedWords = shuffleArray([
      ...currentOriginalWords, 
      ...decoyWords.slice(0, Math.max(0, 18 - currentOriginalWords.length))
    ]); 
    setWordPool(combinedWords);

    // Rastgele 3 kelimenin sırasını seç (örneğin 3., 7. ve 11. kelime)
    const indices = [...Array(currentOriginalWords.length).keys()];
    const shuffledIndices = shuffleArray(indices);
    const indicesToVerify = shuffledIndices.slice(0, 3).sort((a,b) => a-b);
    setSelectionOrder(indicesToVerify);
  }, [mnemonic]); // originalWords yerine mnemonic'i dependency yapalım, originalWords zaten useMemo ile mnemonic'e bağlı.

  const handleWordSelection = (word: string) => {
    setErrorMessage(null);
    const targetWordIndex = selectionOrder[currentStep];
    const targetWord = originalWords[targetWordIndex];

    if (word === targetWord) {
      const newSelectedWords = [...selectedWords, word];
      setSelectedWords(newSelectedWords);
      if (currentStep < selectionOrder.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        // Doğrulama tamamlandı
        Alert.alert('Doğrulama Başarılı!', 'Kurtarma ifadeniz başarıyla doğrulandı.');
        navigation.navigate('SetPassword', { mnemonic }); // Şifre belirleme ekranına git
      }
    } else {
      setErrorMessage('Yanlış kelime seçtiniz. Lütfen tekrar deneyin.');
    }
  };

  if (selectionOrder.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Doğrulama hazırlanıyor...</Text>
      </SafeAreaView>
    );
  }

  const targetWordPrompt = `Lütfen ${selectionOrder[currentStep] + 1}. kelimeyi seçin:`

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Kurtarma İfadesini Doğrula</Text>
        <Text style={styles.instructions}>{targetWordPrompt}</Text>

        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

        <View style={styles.wordPoolContainer}>
          {wordPool.map((word, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.wordButton}
              onPress={() => handleWordSelection(word)}
            >
              <Text style={styles.wordButtonText}>{word}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.selectedWordsContainer}>
            <Text style={styles.selectedWordsTitle}>Seçilen Kelimeler:</Text>
            {selectedWords.map((word, index) => (
                <Text key={index} style={styles.selectedWordText}>{selectionOrder[index]+1}. {word}</Text>
            ))}
        </View>

        <Button 
          title="Geri"
          onPress={() => navigation.goBack()}
          color="#A09DAE"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#242038',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 15,
  },
  instructions: {
    fontSize: 18,
    color: '#A09DAE',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  wordPoolContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 25,
  },
  wordButton: {
    backgroundColor: '#3A3557',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    margin: 5,
  },
  wordButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  selectedWordsContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  selectedWordsTitle: {
    fontSize: 16,
    color: '#A09DAE',
    marginBottom: 5,
  },
 selectedWordText: {
    fontSize: 15,
    color: '#FFFFFF',
    marginBottom: 3,
  },
});

export default VerifyMnemonicScreen; 