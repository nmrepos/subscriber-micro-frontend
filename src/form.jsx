import { useState } from 'preact/hooks';
import { trace } from '@opentelemetry/api';
import Toast from './toast'; // Adjust path as needed

const tracer = trace.getTracer('subscriber-form', '1.0.0');

export function SubscriberForm() {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('');

  const handleShowToast = (message, type = '') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const handleCloseToast = () => {
    setShowToast(false);
    setToastMessage('');
    setToastType('');
  };

  return <form onSubmit={event => {
    event.preventDefault();
    
    // Start a custom span for form submission
    const span = tracer.startSpan('subscriber-form-submission');
    span.setAttributes({
      'form.action': 'subscribe',
      'user.interface': 'micro-frontend'
    });
    
    const formData = new FormData(event.target);
    const formObject = Object.fromEntries(formData.entries());
    
    // Add form data to span attributes (without sensitive info)
    span.setAttributes({
      'form.has_name': !!formObject.name,
      'form.has_email': !!formObject.email,
      'form.name_length': formObject.name ? formObject.name.length : 0
    });
    
    const sUrl = `${import.meta.url.substring(0, import.meta.url.lastIndexOf('/'))}/subscribers`
    
    fetch(sUrl, {
      method: 'POST', // Specify the HTTP method as POST
      headers: {
        'Content-Type': 'application/json' // Indicate that the request body is JSON
      },
      body: JSON.stringify(formObject) // Convert the JavaScript object to a JSON string
    })
      .then(response => {
        span.setAttributes({
          'http.response.status_code': response.status,
          'http.response.success': response.ok
        });
        
        response.json().then(data => {
          handleShowToast(data.message, response.ok ? "success" : "error");
          span.setAttributes({
            'response.message': data.message
          });
          span.setStatus({ code: response.ok ? 1 : 2 }); // OK or ERROR
          span.end();
          console.log(data); // Handle the response data
        })

      })
      .catch(error => {
        span.setAttributes({
          'error.message': error.message,
          'error.name': error.name
        });
        span.setStatus({ code: 2, message: error.message }); // ERROR
        span.end();
        console.error('Error:', error); // Handle any errors during the fetch operation
      });        // console.log(formObject);
  }}>
    <label>
      name
      <input name="name" placeholder="your name" />
    </label>
    <label>
      email
      <input name="email" type="email" placeholder="your email address" />
    </label>
    <button type="submit">Send</button>
    {showToast && (
      <div style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 1000 }}>
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={handleCloseToast}
        />
      </div>
    )}
  </form>
}