import React from 'react'

const LoaderSpinner = ({ color }: {color: string}) => {
    return (
        <div className={`lds-ellipsis`}><div className={`${color}`}></div><div className={`${color}`}></div><div className={`${color}`}></div><div className={`${color}`}></div></div>
    )
}

export default LoaderSpinner