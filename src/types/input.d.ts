declare namespace JSX {
  interface InputHTMLAttributes<T> extends React.InputHTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
} 