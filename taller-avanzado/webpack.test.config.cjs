module.exports = {
  mode: 'development',
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: { chrome: '90' } }],
              ['@babel/preset-react', { runtime: 'automatic' }],
            ],
          },
        },
        // Permite imports sin extensión (.js) en proyectos con "type": "module"
        resolve: { fullySpecified: false },
      },
      {
        test: /\.css$/,
        use: 'null-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
}
