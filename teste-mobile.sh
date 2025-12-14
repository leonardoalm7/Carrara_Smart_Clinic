#!/bin/bash

# Script rápido para testar o site no mobile
# Uso: ./teste-mobile.sh

echo "🚀 Iniciando servidor para teste mobile..."
echo ""
echo "📱 Para testar no iPhone:"
echo "   1. Certifique-se que iPhone e Mac estão na mesma Wi-Fi"
echo "   2. No iPhone, abra Safari"
echo "   3. Acesse: http://192.168.1.6:3000"
echo ""
echo "💡 Pressione Ctrl+C para parar o servidor"
echo ""

node server.js

